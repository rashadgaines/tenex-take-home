import OpenAI from 'openai';
import { createDateFromStrings, getUserTimezoneFromDb, isInPast } from '../date-utils';
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatContext,
  ActionButton,
  BriefData,
  Insight,
  ActionItem,
} from '@/types/ai';
import { DaySchedule } from '@/types/calendar';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/types/user';
import { EmailSuggestion } from '@/types/email';
import {
  SYSTEM_PROMPT,
  buildScheduleContext,
  buildProtectedTimesContext,
  buildViewContext,
  buildBriefPrompt,
  buildEmailDraftPrompt,
} from './prompts';
import { calculateTimeAnalytics, calculateAvailableSlots, calculateDayStats } from './analytics';
import { createEvent } from '@/lib/google/calendar';

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
}

/**
 * Process a chat message and generate a response
 */
export async function processChat(
  request: ChatRequest,
  schedule: DaySchedule,
  preferences: UserPreferences = DEFAULT_USER_PREFERENCES,
  userId?: string
): Promise<ChatResponse> {
  const { message, context } = request;

  // Check if this is a scheduling request that we can handle directly
  const schedulingResult = await detectAndHandleSchedulingRequest(message, schedule, preferences, userId);
  if (schedulingResult) {
    return schedulingResult;
  }

  // Build the full context for the AI
  const scheduleContext = buildScheduleContext(schedule, preferences);
  const protectedContext = buildProtectedTimesContext(preferences);
  const viewContext = context?.currentView
    ? buildViewContext(context.currentView)
    : '';

  // Build conversation history for the API
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}

Current context:
${scheduleContext}

${protectedContext}

${viewContext}`,
    },
  ];

  // Add conversation history if provided
  if (context?.conversationHistory) {
    for (const msg of context.conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add the current user message
  messages.push({
    role: 'user',
    content: message,
  });

  // Call OpenAI API
  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages,
  });

  // Extract the text response
  const responseText = response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

  // Generate suggested actions based on the response content
  const suggestedActions = detectSuggestedActions(responseText, message);

  // Create the response message
  const responseMessage: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: responseText,
    timestamp: new Date(),
  };

  return {
    message: responseMessage,
    suggestedActions,
  };
}

/**
 * Generate a daily brief
 */
export async function generateBrief(
  schedule: DaySchedule,
  preferences: UserPreferences,
  userName: string
): Promise<BriefData> {
  const prompt = buildBriefPrompt({ userName, schedule, preferences });

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  const briefText = response.choices[0]?.message?.content || '';

  // Parse the brief response
  const lines = briefText.split('\n').filter((l) => l.trim());
  const greeting = lines[0] || getTimeBasedGreeting();
  const summary = lines.slice(1).join(' ') || 'Your calendar is ready for review.';

  // Generate action items from schedule
  const actionItems = generateActionItems(schedule);

  // Generate insight
  const insight = generateQuickInsight(schedule);

  return {
    greeting,
    date: new Date(),
    summary,
    todaySchedule: schedule,
    actionItems,
    emailSuggestions: [], // This would be populated from actual email data
    insight,
  };
}

/**
 * Generate an email draft
 */
export async function generateEmailDraft(params: {
  userName: string;
  recipient: string;
  recipientName?: string;
  purpose: string;
  suggestedTimes?: Date[];
  tone?: 'formal' | 'casual' | 'neutral';
}): Promise<string> {
  const timesFormatted = params.suggestedTimes?.map((t) =>
    t.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  );

  const prompt = buildEmailDraftPrompt({
    userName: params.userName,
    recipient: params.recipient,
    recipientName: params.recipientName,
    purpose: params.purpose,
    suggestedTimes: timesFormatted,
    tone: params.tone,
  });

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Detect and handle scheduling requests by actually creating events
 */
async function detectAndHandleSchedulingRequest(
  message: string,
  schedule: DaySchedule,
  preferences: UserPreferences,
  userId?: string
): Promise<ChatResponse | null> {
  const lowerMessage = message.toLowerCase();

  // Check for scheduling patterns (more comprehensive)
  const schedulingPatterns = [
    /schedule.*meeting/i,
    /set up.*meeting/i,
    /create.*meeting/i,
    /book.*meeting/i,
    /schedule.*call/i,
    /set up.*call/i,
    /add.*event/i,
    /create.*event/i,
    /block.*time/i,
    /schedule.*appointment/i,
    /book.*appointment/i,
    /plan.*meeting/i,
    /organize.*meeting/i,
  ];

  const isSchedulingRequest = schedulingPatterns.some(pattern => pattern.test(lowerMessage));

  if (!isSchedulingRequest || !userId) {
    return null;
  }

  try {
    // Use AI to extract event details from the message with better prompting
    const extractionPrompt = `Extract event details from this scheduling request. Return ONLY a valid JSON object with these exact fields:
- title: string (brief, descriptive title for the event, max 100 chars)
- duration: number (duration in minutes: 15, 30, 60, 90, 120, etc.)
- date: string (YYYY-MM-DD format, or null if not specified)
- time: string (HH:MM format in 24-hour time, e.g., "14:30" for 2:30 PM, or null if not specified)
- attendees: string[] (array of valid email addresses only, or empty array)
- description: string (additional details about the event, or empty string)
- location: string (meeting location if mentioned, or empty string)

IMPORTANT: 
- Only include valid email addresses in attendees array
- Duration should be reasonable (15-480 minutes)
- Date should be in YYYY-MM-DD format or null
- Time should be in HH:MM 24-hour format or null

Examples:
Input: "Schedule a 30 min call with john@company.com tomorrow at 3pm"
Output: {"title":"Call with John","duration":30,"date":"2024-01-30","time":"15:00","attendees":["john@company.com"],"description":"","location":""}

Input: "Set up a team meeting next Monday at 2pm for 1 hour"
Output: {"title":"Team Meeting","duration":60,"date":"2024-01-29","time":"14:00","attendees":[],"description":"","location":""}

Message: "${message}"

Current date: ${new Date().toISOString().split('T')[0]}
Working hours: ${preferences.workingHours.start} - ${preferences.workingHours.end}`;

    const extractionResponse = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 300, // Increased for better responses
      temperature: 0.1, // Lower temperature for more consistent parsing
      messages: [
        { role: 'system', content: 'Extract event details as valid JSON only. Be precise with dates, times, and emails.' },
        { role: 'user', content: extractionPrompt },
      ],
    });

    const extractionText = extractionResponse.choices[0]?.message?.content?.trim();

    if (!extractionText) {
      throw new Error('No response from AI extraction');
    }

    let eventDetails;
    try {
      // Clean up the response - remove markdown code blocks and extra text
      const cleanText = extractionText
        .replace(/```json\s*/i, '')
        .replace(/```\s*$/, '')
        .replace(/^[^{]*/, '') // Remove any text before the first {
        .replace(/[^}]*$/, '') // Remove any text after the last }
        .trim();

      eventDetails = JSON.parse(cleanText);

      // Validate the parsed data structure
      if (typeof eventDetails !== 'object' || eventDetails === null) {
        throw new Error('Invalid response structure');
      }

    } catch (parseError) {
      console.error('Failed to parse AI extraction response:', extractionText, parseError);

      // Create a basic event from the message if parsing fails
      const titleMatch = message.match(/(?:schedule|set up|create|book|add)\s+(.+?)(?:\s+(?:for|at|on|tomorrow|today|next|this)|\s*$)/i);
      const title = titleMatch ? titleMatch[1].trim() : (message.length > 50 ? message.substring(0, 47) + '...' : message);

      eventDetails = {
        title: title.substring(0, 100), // Ensure reasonable length
        duration: 30,
        date: null,
        time: null,
        attendees: [],
        description: '',
        location: '',
      };
    }

    // Validate extracted data
    if (!eventDetails.title || typeof eventDetails.title !== 'string') {
      throw new Error('Could not extract valid event title');
    }

    // Determine date and time with smart defaults and validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let eventDate: Date;
    let eventTime: string;

    // Parse date
    if (eventDetails.date && typeof eventDetails.date === 'string') {
      try {
        const parsedDate = new Date(eventDetails.date + 'T00:00:00');
        if (!isNaN(parsedDate.getTime())) {
          eventDate = parsedDate;
        } else {
          throw new Error('Invalid date format');
        }
      } catch (error) {
        console.warn('Invalid date extracted, using smart defaults');
        eventDate = tomorrow;
      }
    } else {
      // Smart date detection from message
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('tomorrow')) {
        eventDate = tomorrow;
      } else if (lowerMessage.includes('today')) {
        eventDate = today;
      } else if (lowerMessage.includes('next monday') || lowerMessage.includes('monday')) {
        const nextMonday = new Date(today);
        const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
        nextMonday.setDate(today.getDate() + daysUntilMonday);
        eventDate = nextMonday;
      } else if (lowerMessage.includes('next week')) {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        eventDate = nextWeek;
      } else {
        eventDate = tomorrow; // Default to tomorrow
      }
    }

    // Parse time
    if (eventDetails.time && typeof eventDetails.time === 'string') {
      const timeMatch = eventDetails.time.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          eventTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
          throw new Error('Invalid time format');
        }
      } else {
        throw new Error('Invalid time format');
      }
    } else {
      // Smart time detection or default to working hours start
      const workingStart = preferences.workingHours?.start;
      eventTime = workingStart && /^\d{1,2}:\d{2}$/.test(workingStart) ? workingStart : '10:00';
    }

    // Validate duration
    const duration = typeof eventDetails.duration === 'number' && eventDetails.duration > 0
      ? Math.max(15, Math.min(480, eventDetails.duration)) // Clamp between 15min and 8hrs
      : 30; // Default to 30 minutes

    // Get user's timezone for proper date handling
    const userTimezone = userId ? await getUserTimezoneFromDb(userId) : 'America/Los_Angeles';

    // Create event data with timezone-aware validation
    const eventStart = createDateFromStrings(
      eventDate.toISOString().split('T')[0],
      eventTime,
      userTimezone
    );
    const eventEnd = new Date(eventStart.getTime() + duration * 60 * 1000);

    // Ensure the event is not in the past (timezone-aware check)
    if (isInPast(eventStart, userTimezone)) {
      // Move to tomorrow at the same time
      eventStart.setDate(eventStart.getDate() + 1);
      eventEnd.setDate(eventEnd.getDate() + 1);
    }

    // Validate attendees
    const validAttendees = Array.isArray(eventDetails.attendees)
      ? eventDetails.attendees.filter((email: unknown): email is string => {
          if (typeof email !== 'string') return false;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email) && email.length <= 254;
        })
      : [];

    const eventData = {
      title: eventDetails.title.substring(0, 100).trim(), // Limit title length
      description: (eventDetails.description || '').substring(0, 1000).trim(), // Limit description
      start: eventStart,
      end: eventEnd,
      timezone: userTimezone,
      attendees: validAttendees,
      location: (eventDetails.location || '').substring(0, 200).trim(), // Limit location
    };

    // Final validation before creating
    if (!eventData.title) {
      throw new Error('Event must have a valid title');
    }

    if (eventData.start >= eventData.end) {
      throw new Error('Event start time must be before end time');
    }

    // Create the event with error handling
    const createdEvent = await createEvent(userId, eventData);

    // Return success response
    const responseMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `✅ I've scheduled "${createdEvent.title}" for ${eventData.start.toLocaleDateString('en-US', { timeZone: userTimezone })} at ${eventData.start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: userTimezone
      })} - ${eventData.end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: userTimezone
      })}.` + (createdEvent.attendees.length > 0 ? ` Invitations sent to ${createdEvent.attendees.length} attendee(s).` : ''),
      timestamp: new Date(),
    };

    return {
      message: responseMessage,
      suggestedActions: [],
    };

  } catch (error) {
    console.error('Failed to create event:', error);
    return null; // Fall back to normal AI response
  }
}

/**
 * Get tomorrow's date as YYYY-MM-DD
 */
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Detect potential suggested actions based on message content
 */
function detectSuggestedActions(response: string, userMessage: string): ActionButton[] {
  const actions: ActionButton[] = [];
  const lowerResponse = response.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();

  // If discussing scheduling
  if (
    lowerMessage.includes('schedule') ||
    lowerMessage.includes('meeting') ||
    lowerMessage.includes('time')
  ) {
    if (lowerResponse.includes('available') || lowerResponse.includes('free')) {
      actions.push({
        label: 'Suggest times',
        action: 'suggest_times',
      });
    }
  }

  // If discussing emails
  if (lowerMessage.includes('email') || lowerMessage.includes('send')) {
    actions.push({
      label: 'Draft email',
      action: 'send_email',
    });
  }

  // If the response mentions editing or changing
  if (lowerResponse.includes('edit') || lowerResponse.includes('change')) {
    actions.push({
      label: 'Edit',
      action: 'edit',
    });
  }

  return actions.slice(0, 3); // Limit to 3 actions
}

/**
 * Generate action items from schedule
 */
function generateActionItems(schedule: DaySchedule): ActionItem[] {
  const items: ActionItem[] = [];

  // Check for conflicts (overlapping events)
  const events = [...schedule.events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  for (let i = 0; i < events.length - 1; i++) {
    const current = events[i];
    const next = events[i + 1];

    if (new Date(current.end) > new Date(next.start)) {
      items.push({
        id: generateId(),
        type: 'conflict',
        title: 'Schedule conflict',
        description: `"${current.title}" overlaps with "${next.title}"`,
        actions: [
          { label: 'Resolve', action: 'open_chat' },
          { label: 'Dismiss', action: 'dismiss' },
        ],
      });
    }
  }

  // Check for meetings without agendas
  const meetingsWithoutAgenda = events.filter(
    (e) => (e.category === 'meeting' || e.category === 'external') && !e.hasAgenda
  );

  for (const meeting of meetingsWithoutAgenda.slice(0, 2)) {
    items.push({
      id: generateId(),
      type: 'reminder',
      title: 'Meeting without agenda',
      description: `"${meeting.title}" has no agenda set`,
      actions: [
        { label: 'Add agenda', action: 'edit' },
        { label: 'Dismiss', action: 'dismiss' },
      ],
    });
  }

  return items;
}

/**
 * Generate a quick insight for the brief
 */
function generateQuickInsight(schedule: DaySchedule): Insight | undefined {
  const { stats } = schedule;
  const totalScheduled = stats.meetingMinutes + stats.focusMinutes;
  const workdayMinutes = 8 * 60;

  if (stats.meetingMinutes > workdayMinutes * 0.6) {
    return {
      id: generateId(),
      type: 'warning',
      message: `Heavy meeting day ahead with ${Math.round(stats.meetingMinutes / 60)} hours of meetings.`,
      actionable: true,
      action: {
        label: 'Find breaks',
        prompt: 'Can you help me find some break time between my meetings today?',
      },
    };
  }

  if (stats.availableMinutes > workdayMinutes * 0.5) {
    return {
      id: generateId(),
      type: 'observation',
      message: 'Light day ahead. Good time for focused work or catching up.',
      actionable: false,
    };
  }

  if (schedule.events.length > 6) {
    return {
      id: generateId(),
      type: 'observation',
      message: `${schedule.events.length} events on your calendar today. Paced scheduling.`,
      actionable: false,
    };
  }

  return undefined;
}

/**
 * Get a time-based greeting
 */
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a mock schedule for development
 */
export function createMockSchedule(date: Date = new Date()): DaySchedule {
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  const events = [
    {
      id: '1',
      title: 'Team Standup',
      start: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
      end: new Date(baseDate.getTime() + 9.5 * 60 * 60 * 1000),
      attendees: [
        { email: 'colleague@example.com', name: 'Colleague', responseStatus: 'accepted' as const },
      ],
      isAllDay: false,
      category: 'meeting' as const,
      hasAgenda: true,
    },
    {
      id: '2',
      title: 'Focus Time',
      start: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000),
      end: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000),
      attendees: [],
      isAllDay: false,
      category: 'focus' as const,
      hasAgenda: false,
    },
    {
      id: '3',
      title: 'Client Call',
      start: new Date(baseDate.getTime() + 14 * 60 * 60 * 1000),
      end: new Date(baseDate.getTime() + 15 * 60 * 60 * 1000),
      attendees: [
        { email: 'client@example.com', name: 'Client', responseStatus: 'accepted' as const },
      ],
      isAllDay: false,
      category: 'external' as const,
      hasAgenda: false,
    },
  ];

  const stats = calculateDayStats(events);

  return {
    date: baseDate,
    events,
    availableSlots: [], // Would be calculated from preferences
    stats,
  };
}
