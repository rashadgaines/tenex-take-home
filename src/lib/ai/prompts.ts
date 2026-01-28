import { DaySchedule, CalendarEvent } from '@/types/calendar';
import { UserPreferences } from '@/types/user';
import { TimeAnalytics } from '@/types/ai';

/**
 * Base system prompt for the calendar assistant
 */
export const SYSTEM_PROMPT = `You are a calendar assistant helping a professional manage their time and coordinate with others.

Your tone is warm but professional—helpful without being overly casual or stiff. You're like a capable colleague, not a robot or an overeager assistant.

Guidelines:
- Be concise. Respect the user's time.
- When suggesting times, always respect their protected time blocks.
- Default to giving users options rather than making decisions for them.
- If you notice patterns (too many meetings, no breaks), mention them gently.
- Never invent or assume calendar data—only reference what you've been given.
- When drafting emails, match the user's likely tone (professional but personable).

You have access to:
- The user's calendar events
- Their preferences (working hours, protected time)
- The ability to draft emails
- Time analytics for their schedule`;

/**
 * Builds context about the user's current schedule for the AI
 */
export function buildScheduleContext(
  schedule: DaySchedule,
  preferences: UserPreferences
): string {
  const { events, stats } = schedule;
  const date = new Date(schedule.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const eventList = events
    .map((e) => {
      const start = new Date(e.start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      const end = new Date(e.end).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      const attendeeCount = e.attendees.length;
      return `- ${start}-${end}: ${e.title} (${e.category}${attendeeCount > 0 ? `, ${attendeeCount} attendees` : ''})`;
    })
    .join('\n');

  return `Current date: ${date}
Working hours: ${preferences.workingHours.start} - ${preferences.workingHours.end}
Timezone: ${preferences.timezone}

Today's schedule:
${eventList || 'No events scheduled'}

Stats:
- Meeting time: ${Math.round(stats.meetingMinutes / 60 * 10) / 10} hours
- Focus time: ${Math.round(stats.focusMinutes / 60 * 10) / 10} hours
- Available time: ${Math.round(stats.availableMinutes / 60 * 10) / 10} hours`;
}

/**
 * Builds context about protected times
 */
export function buildProtectedTimesContext(preferences: UserPreferences): string {
  if (preferences.protectedTimes.length === 0) {
    return 'No protected time blocks configured.';
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const blocks = preferences.protectedTimes
    .map((pt) => {
      const days = pt.days.map((d) => dayNames[d]).join(', ');
      return `- ${pt.label}: ${pt.start}-${pt.end} on ${days}`;
    })
    .join('\n');

  return `Protected time blocks (do not schedule over these):
${blocks}`;
}

/**
 * Template for generating email drafts
 */
export function buildEmailDraftPrompt(params: {
  userName: string;
  recipient: string;
  recipientName?: string;
  purpose: string;
  suggestedTimes?: string[];
  tone?: 'formal' | 'casual' | 'neutral';
}): string {
  const { userName, recipient, recipientName, purpose, suggestedTimes, tone = 'neutral' } = params;

  const timesSection = suggestedTimes?.length
    ? `\nSuggested times to offer:\n${suggestedTimes.map((t) => `- ${t}`).join('\n')}`
    : '';

  const toneGuidance = {
    formal: 'Use professional, formal language.',
    casual: 'Keep it friendly and conversational.',
    neutral: 'Be professional but personable.',
  };

  return `Draft a brief, professional email for ${userName} to send to ${recipientName || recipient}.

Purpose: ${purpose}${timesSection}

Guidelines:
- Keep it short (3-5 sentences max)
- Sound natural, not templated
- ${toneGuidance[tone]}
- End with a clear ask or next step
- Don't use overly formal language like "I hope this email finds you well"

Return only the email body text, no subject line or greeting/signature formatting.`;
}

/**
 * Template for generating daily brief summary
 */
export function buildBriefPrompt(params: {
  userName: string;
  schedule: DaySchedule;
  preferences: UserPreferences;
}): string {
  const { userName, schedule, preferences } = params;
  const scheduleContext = buildScheduleContext(schedule, preferences);

  return `Generate a brief, helpful morning summary for ${userName}.

${scheduleContext}

Provide:
1. A friendly but concise greeting appropriate for the time of day
2. A 1-2 sentence summary of what their day looks like
3. Note any important items requiring attention (conflicts, back-to-back meetings, etc.)

Keep the entire response under 100 words. Be warm but efficient.`;
}

/**
 * Template for analyzing time usage and generating insights
 */
export function buildAnalyticsInsightPrompt(analytics: TimeAnalytics): string {
  return `Analyze this calendar data and provide 2-3 actionable insights.

Time period: ${analytics.period}
Date range: ${new Date(analytics.startDate).toLocaleDateString()} - ${new Date(analytics.endDate).toLocaleDateString()}
Meeting percentage: ${analytics.meetingPercent}%
Focus time percentage: ${analytics.focusPercent}%
Available percentage: ${analytics.availablePercent}%
Buffer time: ${analytics.bufferPercent}%
Total meeting hours: ${analytics.totalMeetingHours}
Longest focus block: ${analytics.longestFocusBlock} minutes
Busiest day: ${analytics.busiestDay}

Guidelines:
- Lead with the most important observation
- Be specific with numbers
- Suggest concrete actions when relevant
- Don't be preachy about "work-life balance"
- Keep insights to 1-2 sentences each

Format as a JSON array of insight objects with structure:
[{ "type": "observation|warning|suggestion", "message": "...", "actionable": true/false }]`;
}

/**
 * Build context for chat based on current view
 */
export function buildViewContext(
  view: 'brief' | 'plan' | 'time' | 'calendar',
  additionalContext?: string
): string {
  const viewDescriptions = {
    brief: 'The user is viewing their daily brief/home screen.',
    plan: 'The user is in the planning view, likely wanting to schedule something.',
    time: 'The user is viewing time analytics about their schedule.',
    calendar: 'The user is viewing the traditional calendar grid.',
  };

  return `${viewDescriptions[view]}${additionalContext ? `\n\nAdditional context: ${additionalContext}` : ''}`;
}

/**
 * Format events for display in chat
 */
export function formatEventsForChat(events: CalendarEvent[]): string {
  if (events.length === 0) return 'No events found.';

  return events
    .map((e) => {
      const start = new Date(e.start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      const end = new Date(e.end).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      return `${start}-${end}: ${e.title}`;
    })
    .join('\n');
}
