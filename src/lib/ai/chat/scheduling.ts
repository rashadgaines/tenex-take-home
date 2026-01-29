/**
 * Scheduling logic for meeting creation
 */
import { ChatResponse, ChatMessage, ExecutedAction } from '@/types/ai';
import { DaySchedule } from '@/types/calendar';
import { UserPreferences } from '@/types/user';
import { createDateFromStrings, isInPast } from '../../date-utils';
import { getUserTimezone } from '../../user-preferences';
import { createEvent } from '@/lib/google/calendar';
import { getOpenAIClient, generateId, cleanJsonResponse } from './utils';
import { ExtractedMeetingData, CreateMeetingsResult } from './types';

/**
 * Detect and handle scheduling requests by actually creating events
 * Supports both single meeting and multi-meeting requests
 */
export async function detectAndHandleSchedulingRequest(
  message: string,
  schedule: DaySchedule,
  preferences: UserPreferences,
  userId?: string
): Promise<ChatResponse | null> {
  const lowerMessage = message.toLowerCase();

  // Check for scheduling patterns (comprehensive)
  const schedulingPatterns = [
    /schedule.*meeting/i,
    /schedule.*call/i,
    /schedule.*sync/i,
    /schedule.*standup/i,
    /schedule.*catchup/i,
    /schedule.*catch-up/i,
    /schedule.*chat/i,
    /schedule.*check-in/i,
    /schedule.*checkin/i,
    /schedule.*1[:\-]1/i,
    /schedule.*one[:\-]on[:\-]one/i,
    /schedule.*appointment/i,
    /schedule.*session/i,
    /schedule.*interview/i,
    /schedule.*review/i,
    /schedule.*demo/i,
    /schedule.*presentation/i,
    /schedule.*(15|30|45|60|90)\s*(min|minute)/i,
    /set up.*meeting/i,
    /set up.*call/i,
    /set up.*sync/i,
    /set up.*time/i,
    /create.*meeting/i,
    /create.*event/i,
    /book.*meeting/i,
    /book.*call/i,
    /book.*time/i,
    /book.*appointment/i,
    /add.*event/i,
    /add.*meeting/i,
    /block.*time/i,
    /plan.*meeting/i,
    /organize.*meeting/i,
    /\b(meeting|sync|call)\s+with\s+\S+@\S+/i,  // "meeting with email@domain.com"
  ];

  const isSchedulingRequest = schedulingPatterns.some(pattern => pattern.test(lowerMessage));

  if (!isSchedulingRequest || !userId) {
    return null;
  }

  try {
    // Use AI to extract event details - supports multiple meetings
    const extractionPrompt = `Extract event details from this scheduling request. The user may be requesting ONE or MULTIPLE meetings.

Return a JSON object with:
- isBatch: boolean (true if multiple distinct meetings are requested, false for single meeting)
- meetings: array of meeting objects, each with:
  - title: string (brief, descriptive title, max 100 chars)
  - duration: number (minutes: 15, 30, 60, 90, 120, etc.)
  - date: string (YYYY-MM-DD format, or null if not specified)
  - time: string (HH:MM 24-hour format, or null if not specified)
  - attendees: string[] (valid email addresses only, or empty array)
  - description: string (details, or empty string)
  - location: string (location if mentioned, or empty string)

IMPORTANT:
- If user mentions multiple people with different times/dates, create SEPARATE meetings for each
- "meetings with Joe, Dan, and Sally" = 3 separate meetings (isBatch: true)
- "team meeting with Joe, Dan, Sally" = 1 meeting with all as attendees (isBatch: false)
- Only include valid email addresses in attendees array
- Duration should be 15-480 minutes

Examples:
Input: "Schedule meetings with alice@test.com tomorrow at 2pm and bob@test.com on Friday at 10am"
Output: {"isBatch":true,"meetings":[{"title":"Meeting with Alice","duration":30,"date":"2024-01-30","time":"14:00","attendees":["alice@test.com"],"description":"","location":""},{"title":"Meeting with Bob","duration":30,"date":"2024-02-02","time":"10:00","attendees":["bob@test.com"],"description":"","location":""}]}

Input: "Set up a team meeting with alice@test.com and bob@test.com Monday at 2pm"
Output: {"isBatch":false,"meetings":[{"title":"Team Meeting","duration":30,"date":"2024-01-29","time":"14:00","attendees":["alice@test.com","bob@test.com"],"description":"","location":""}]}

Input: "I need to schedule three meetings with Joe, Dan, and Sally next week"
Output: {"isBatch":true,"meetings":[{"title":"Meeting with Joe","duration":30,"date":null,"time":null,"attendees":[],"description":"","location":""},{"title":"Meeting with Dan","duration":30,"date":null,"time":null,"attendees":[],"description":"","location":""},{"title":"Meeting with Sally","duration":30,"date":null,"time":null,"attendees":[],"description":"","location":""}]}

Message: "${message}"

Current date: ${new Date().toISOString().split('T')[0]}
Working hours: ${preferences.workingHours.start} - ${preferences.workingHours.end}`;

    const extractionResponse = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'Extract event details as valid JSON only. Support both single and multiple meeting requests. Be precise with dates, times, and emails.' },
        { role: 'user', content: extractionPrompt },
      ],
    });

    const extractionText = extractionResponse.choices[0]?.message?.content?.trim();

    if (!extractionText) {
      throw new Error('No response from AI extraction');
    }

    let extractedData;
    try {
      const cleanText = cleanJsonResponse(extractionText);
      extractedData = JSON.parse(cleanText);

      if (typeof extractedData !== 'object' || extractedData === null) {
        throw new Error('Invalid response structure');
      }

      // Ensure meetings array exists
      if (!Array.isArray(extractedData.meetings) || extractedData.meetings.length === 0) {
        throw new Error('No meetings extracted');
      }

    } catch (parseError) {
      // Fallback: create a basic single event
      const titleMatch = message.match(/(?:schedule|set up|create|book|add)\s+(.+?)(?:\s+(?:for|at|on|tomorrow|today|next|this)|\s*$)/i);
      const title = titleMatch ? titleMatch[1].trim() : (message.length > 50 ? message.substring(0, 47) + '...' : message);

      extractedData = {
        isBatch: false,
        meetings: [{
          title: title.substring(0, 100),
          duration: 30,
          date: null,
          time: null,
          attendees: [],
          description: '',
          location: '',
        }],
      };
    }

    const userTimezone = await getUserTimezone(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Process all meetings
    const results = await createMultipleMeetings(
      extractedData.meetings,
      userId,
      preferences,
      userTimezone,
      message,
      today,
      tomorrow
    );

    // Build response message with action steps
    let responseContent: string;
    const actionSteps: string[] = [];

    if (results.created.length === 0) {
      throw new Error('Failed to create any meetings');
    } else if (results.created.length === 1) {
      const meeting = results.created[0];
      const timeStr = meeting.start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: userTimezone
      });
      const dateStr = meeting.start.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: userTimezone
      });

      // Build action steps for CLI-like feedback
      actionSteps.push(`✓ Created calendar event`);
      if (meeting.attendees.length > 0) {
        actionSteps.push(`✓ Sent invitation to ${meeting.attendees.join(', ')}`);
      }

      const stepsDisplay = actionSteps.map(s => `  ${s}`).join('\n');
      responseContent = `${stepsDisplay}\n\n**${meeting.title}** scheduled for ${dateStr} at ${timeStr}.`;
    } else {
      // Multiple meetings
      for (const meeting of results.created) {
        actionSteps.push(`✓ Created "${meeting.title}"`);
        if (meeting.attendees.length > 0) {
          actionSteps.push(`  └ Sent invitation to ${meeting.attendees.join(', ')}`);
        }
      }

      const stepsDisplay = actionSteps.map(s => `  ${s}`).join('\n');
      responseContent = `${stepsDisplay}\n\n**${results.created.length} meetings scheduled.**`;

      if (results.failed.length > 0) {
        responseContent += `\n\n⚠ Failed to schedule: ${results.failed.map(f => f.title).join(', ')}`;
      }
    }

    const responseMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
    };

    // Build executed actions for UI feedback
    const executedActions: ExecutedAction[] = results.created.map((meeting, i) => ({
      id: `action-schedule-${i}`,
      type: 'schedule' as const,
      label: `Created "${meeting.title}"`,
      status: 'completed' as const,
      detail: meeting.attendees.length > 0 ? `Invitation sent to ${meeting.attendees.join(', ')}` : undefined,
    }));

    // Add failed actions
    for (const failed of results.failed) {
      executedActions.push({
        id: `action-schedule-failed-${failed.title}`,
        type: 'schedule' as const,
        label: `Failed: ${failed.title}`,
        status: 'failed' as const,
        detail: failed.error,
      });
    }

    return {
      message: responseMessage,
      suggestedActions: [],
      executedActions,
    };

  } catch (error) {
    return null;
  }
}

/**
 * Helper to create multiple meetings
 */
export async function createMultipleMeetings(
  meetings: ExtractedMeetingData[],
  userId: string,
  preferences: UserPreferences,
  userTimezone: string,
  originalMessage: string,
  today: Date,
  tomorrow: Date
): Promise<CreateMeetingsResult> {
  const created: Array<{ title: string; start: Date; end: Date; attendees: string[] }> = [];
  const failed: Array<{ title: string; error: string }> = [];

  for (const meeting of meetings) {
    try {
      if (!meeting.title || typeof meeting.title !== 'string') {
        throw new Error('Invalid meeting title');
      }

      // Parse date with smart defaults
      let eventDate: Date;
      if (meeting.date && typeof meeting.date === 'string') {
        const parsedDate = new Date(meeting.date + 'T00:00:00');
        eventDate = !isNaN(parsedDate.getTime()) ? parsedDate : tomorrow;
      } else {
        // Smart date detection
        const lowerMessage = originalMessage.toLowerCase();
        if (lowerMessage.includes('tomorrow')) {
          eventDate = tomorrow;
        } else if (lowerMessage.includes('today')) {
          eventDate = today;
        } else if (lowerMessage.includes('next monday') || lowerMessage.includes('monday')) {
          const nextMonday = new Date(today);
          const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
          nextMonday.setDate(today.getDate() + daysUntilMonday);
          eventDate = nextMonday;
        } else if (lowerMessage.includes('friday')) {
          const nextFriday = new Date(today);
          const daysUntilFriday = (12 - today.getDay()) % 7 || 7;
          nextFriday.setDate(today.getDate() + daysUntilFriday);
          eventDate = nextFriday;
        } else if (lowerMessage.includes('next week')) {
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          eventDate = nextWeek;
        } else {
          eventDate = tomorrow;
        }
      }

      // Parse time
      let eventTime: string;
      if (meeting.time && typeof meeting.time === 'string' && /^(\d{1,2}):(\d{2})$/.test(meeting.time)) {
        const [hours, minutes] = meeting.time.split(':').map(Number);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          eventTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
          eventTime = preferences.workingHours?.start || '10:00';
        }
      } else {
        eventTime = preferences.workingHours?.start || '10:00';
      }

      const duration = typeof meeting.duration === 'number' && meeting.duration > 0
        ? Math.max(15, Math.min(480, meeting.duration))
        : 30;

      const eventStart = createDateFromStrings(
        eventDate.toISOString().split('T')[0],
        eventTime,
        userTimezone
      );
      const eventEnd = new Date(eventStart.getTime() + duration * 60 * 1000);

      // Ensure not in past
      if (isInPast(eventStart, userTimezone)) {
        eventStart.setDate(eventStart.getDate() + 1);
        eventEnd.setDate(eventEnd.getDate() + 1);
      }

      // Validate attendees
      const validAttendees = Array.isArray(meeting.attendees)
        ? meeting.attendees.filter((email): email is string => {
            if (typeof email !== 'string') return false;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email) && email.length <= 254;
          })
        : [];

      const eventData = {
        title: meeting.title.substring(0, 100).trim(),
        description: (meeting.description || '').substring(0, 1000).trim(),
        start: eventStart,
        end: eventEnd,
        timezone: userTimezone,
        attendees: validAttendees,
        location: (meeting.location || '').substring(0, 200).trim(),
      };

      const createdEvent = await createEvent(userId, eventData);
      created.push({
        title: createdEvent.title,
        start: eventStart,
        end: eventEnd,
        attendees: validAttendees,
      });

    } catch (error) {
      failed.push({
        title: meeting.title || 'Unknown meeting',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { created, failed };
}
