import OpenAI from 'openai';
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

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process a chat message and generate a response
 */
export async function processChat(
  request: ChatRequest,
  schedule: DaySchedule,
  preferences: UserPreferences = DEFAULT_USER_PREFERENCES
): Promise<ChatResponse> {
  const { message, context } = request;

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
  const response = await openai.chat.completions.create({
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

  const response = await openai.chat.completions.create({
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

  const response = await openai.chat.completions.create({
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
