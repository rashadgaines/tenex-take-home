/**
 * Brief generation functionality
 */
import { BriefData, ActionItem, Insight } from '@/types/ai';
import { DaySchedule } from '@/types/calendar';
import { UserPreferences } from '@/types/user';
import { SYSTEM_PROMPT, buildBriefPrompt } from '../prompts';
import { getOpenAIClient, generateId } from './utils';

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
 * Generate action items from schedule
 */
export function generateActionItems(schedule: DaySchedule): ActionItem[] {
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

  // Check for meetings without agendas (only actual meetings; skip very short ones)
  const MIN_MEETING_MINUTES_FOR_AGENDA = 15;
  const meetingsWithoutAgenda = events.filter((e) => {
    if (e.category !== 'meeting' && e.category !== 'external') return false;
    if (e.hasAgenda) return false;
    const durationMin = (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000;
    return durationMin >= MIN_MEETING_MINUTES_FOR_AGENDA;
  });

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
 * Generate a quick insight for the brief.
 * Uses "meetings" (not "events") when referring to meeting load; only suggests "Find breaks" when there are 2+ meetings.
 */
export function generateQuickInsight(schedule: DaySchedule): Insight | undefined {
  const { stats, events } = schedule;
  const workdayMinutes = 8 * 60;
  const meetingCount = events.filter(
    (e) => e.category === 'meeting' || e.category === 'external'
  ).length;

  if (
    meetingCount >= 2 &&
    stats.meetingMinutes > workdayMinutes * 0.6
  ) {
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
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}
