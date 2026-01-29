import { CalendarEvent, DaySchedule, TimeSlot } from '@/types/calendar';
import { TimeAnalytics, Insight, Recommendation } from '@/types/ai';
import { UserPreferences } from '@/types/user';

/**
 * Calculate time analytics for a given period
 */
export function calculateTimeAnalytics(
  schedules: DaySchedule[],
  period: 'day' | 'week' | 'month',
  preferences: UserPreferences
): TimeAnalytics {
  if (schedules.length === 0) {
    return createEmptyAnalytics(period);
  }

  const sortedSchedules = [...schedules].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate totals
  const totalMeetingMinutes = schedules.reduce((sum, s) => sum + s.stats.meetingMinutes, 0);
  const totalFocusMinutes = schedules.reduce((sum, s) => sum + s.stats.focusMinutes, 0);
  const totalAvailableMinutes = schedules.reduce((sum, s) => sum + s.stats.availableMinutes, 0);

  // Calculate working hours per day
  const workingMinutesPerDay = calculateWorkingMinutes(preferences);
  const totalWorkingMinutes = workingMinutesPerDay * schedules.length;

  // Buffer time is the gap between scheduled events
  const bufferMinutes = Math.max(0, totalWorkingMinutes - totalMeetingMinutes - totalFocusMinutes - totalAvailableMinutes);

  // Find busiest day
  const busiestSchedule = schedules.reduce((busiest, current) =>
    current.stats.meetingMinutes > busiest.stats.meetingMinutes ? current : busiest
  );
  const busiestDay = new Date(busiestSchedule.date).toLocaleDateString('en-US', { weekday: 'long' });

  // Find longest focus block
  const longestFocusBlock = findLongestFocusBlock(schedules);

  // Calculate percentages
  const total = totalMeetingMinutes + totalFocusMinutes + totalAvailableMinutes + bufferMinutes || 1;

  const analytics: TimeAnalytics = {
    period,
    startDate: new Date(sortedSchedules[0].date),
    endDate: new Date(sortedSchedules[sortedSchedules.length - 1].date),
    meetingPercent: Math.round((totalMeetingMinutes / total) * 100),
    focusPercent: Math.round((totalFocusMinutes / total) * 100),
    availablePercent: Math.round((totalAvailableMinutes / total) * 100),
    bufferPercent: Math.round((bufferMinutes / total) * 100),
    totalMeetingHours: Math.round((totalMeetingMinutes / 60) * 10) / 10,
    longestFocusBlock,
    busiestDay,
    insights: [],
  };

  // Generate insights
  analytics.insights = generateInsights(analytics, schedules, preferences);

  return analytics;
}

/**
 * Calculate working minutes per day based on preferences
 */
function calculateWorkingMinutes(preferences: UserPreferences): number {
  const [startHour, startMin] = preferences.workingHours.start.split(':').map(Number);
  const [endHour, endMin] = preferences.workingHours.end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes - startMinutes;
}

/**
 * Find the longest continuous focus block across all schedules
 */
function findLongestFocusBlock(schedules: DaySchedule[]): number {
  let longest = 0;

  for (const schedule of schedules) {
    const focusEvents = schedule.events.filter((e) => e.category === 'focus');

    for (const event of focusEvents) {
      const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000;
      if (duration > longest) {
        longest = duration;
      }
    }

    // Also check available slots for potential focus time
    for (const slot of schedule.availableSlots) {
      if (slot.available) {
        const duration = (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60000;
        if (duration > longest) {
          longest = duration;
        }
      }
    }
  }

  return Math.round(longest);
}

/**
 * Generate insights based on analytics data
 */
function generateInsights(
  analytics: TimeAnalytics,
  schedules: DaySchedule[],
  _preferences: UserPreferences
): Insight[] {
  const insights: Insight[] = [];
  let insightId = 1;

  // Meeting load insight
  if (analytics.meetingPercent > 60) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'warning',
      message: `Meetings are taking up ${analytics.meetingPercent}% of your time. Consider blocking focus time or declining non-essential meetings.`,
      actionable: true,
      action: {
        label: 'Block focus time',
        prompt: 'Help me find time to block for focused work this week',
      },
    });
  } else if (analytics.meetingPercent < 20 && analytics.totalMeetingHours > 0) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'observation',
      message: `Light meeting load this ${analytics.period} at ${analytics.meetingPercent}%. Great opportunity for deep work.`,
      actionable: false,
    });
  }

  // Focus time insight
  if (analytics.longestFocusBlock < 60 && analytics.meetingPercent > 30) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'suggestion',
      message: `Your longest uninterrupted block is only ${analytics.longestFocusBlock} minutes. Try batching meetings to create longer focus periods.`,
      actionable: true,
      action: {
        label: 'Reorganize meetings',
        prompt: 'Can you suggest how to batch my meetings for better focus time?',
      },
    });
  }

  // Back-to-back meetings insight
  const backToBackDays = findBackToBackMeetingDays(schedules);
  if (backToBackDays.length > 0) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'warning',
      message: `You have back-to-back meetings on ${backToBackDays.join(', ')}. Consider adding buffer time.`,
      actionable: true,
      action: {
        label: 'Add buffers',
        prompt: 'Help me add buffer time between my meetings',
      },
    });
  }

  // Busiest day insight
  const avgMeetingMinutes = analytics.totalMeetingHours * 60 / schedules.length;
  const busiestSchedule = schedules.find(
    (s) => new Date(s.date).toLocaleDateString('en-US', { weekday: 'long' }) === analytics.busiestDay
  );
  if (busiestSchedule && busiestSchedule.stats.meetingMinutes > avgMeetingMinutes * 1.5) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'observation',
      message: `${analytics.busiestDay} is your busiest day with ${Math.round(busiestSchedule.stats.meetingMinutes / 60 * 10) / 10} hours of meetings.`,
      actionable: false,
    });
  }

  // Available time insight
  if (analytics.availablePercent > 40) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'observation',
      message: `You have ${analytics.availablePercent}% of your time available. Good flexibility for new commitments.`,
      actionable: false,
    });
  }

  return insights.slice(0, 3); // Return top 3 insights
}

/**
 * Find days with back-to-back meetings (no buffer between meetings)
 */
function findBackToBackMeetingDays(schedules: DaySchedule[]): string[] {
  const backToBackDays: string[] = [];

  for (const schedule of schedules) {
    const meetings = schedule.events
      .filter((e) => e.category === 'meeting' || e.category === 'external')
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    for (let i = 0; i < meetings.length - 1; i++) {
      const currentEnd = new Date(meetings[i].end).getTime();
      const nextStart = new Date(meetings[i + 1].start).getTime();
      const gapMinutes = (nextStart - currentEnd) / 60000;

      if (gapMinutes < 5) {
        const dayName = new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'short' });
        if (!backToBackDays.includes(dayName)) {
          backToBackDays.push(dayName);
        }
        break;
      }
    }
  }

  return backToBackDays;
}

/**
 * Create empty analytics for when there's no data
 */
function createEmptyAnalytics(period: 'day' | 'week' | 'month'): TimeAnalytics {
  const now = new Date();
  return {
    period,
    startDate: now,
    endDate: now,
    meetingPercent: 0,
    focusPercent: 0,
    availablePercent: 100,
    bufferPercent: 0,
    totalMeetingHours: 0,
    longestFocusBlock: 0,
    busiestDay: 'N/A',
    insights: [{
      id: 'insight-empty',
      type: 'observation',
      message: 'No calendar data available for this period.',
      actionable: false,
    }],
  };
}

/**
 * Calculate available time slots for a given day
 */
export function calculateAvailableSlots(
  events: CalendarEvent[],
  date: Date,
  preferences: UserPreferences
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Parse working hours
  const [startHour, startMin] = preferences.workingHours.start.split(':').map(Number);
  const [endHour, endMin] = preferences.workingHours.end.split(':').map(Number);

  const workStart = new Date(date);
  workStart.setHours(startHour, startMin, 0, 0);

  const workEnd = new Date(date);
  workEnd.setHours(endHour, endMin, 0, 0);

  // Sort events by start time
  const sortedEvents = [...events]
    .filter((e) => !e.isAllDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  let currentTime = workStart.getTime();

  for (const event of sortedEvents) {
    const eventStart = new Date(event.start).getTime();
    const eventEnd = new Date(event.end).getTime();

    // Skip events outside working hours
    if (eventEnd <= workStart.getTime() || eventStart >= workEnd.getTime()) {
      continue;
    }

    // If there's a gap before this event, it's available
    if (eventStart > currentTime) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(Math.min(eventStart, workEnd.getTime())),
        available: true,
        timezone: preferences.timezone,
      });
    }

    // Move current time to end of event
    currentTime = Math.max(currentTime, eventEnd);
  }

  // Check for remaining time after last event
  if (currentTime < workEnd.getTime()) {
    slots.push({
      start: new Date(currentTime),
      end: workEnd,
      available: true,
      timezone: preferences.timezone,
    });
  }

  // Filter out protected times
  return filterProtectedTimes(slots, date, preferences);
}

/**
 * Filter out protected times from available slots
 */
function filterProtectedTimes(
  slots: TimeSlot[],
  date: Date,
  preferences: UserPreferences
): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const protectedToday = preferences.protectedTimes.filter((pt) =>
    pt.days.includes(dayOfWeek)
  );

  if (protectedToday.length === 0) {
    return slots;
  }

  const filteredSlots: TimeSlot[] = [];

  for (const slot of slots) {
    let remainingSlot = { ...slot };
    let isFullyProtected = false;

    for (const protected_ of protectedToday) {
      const [protStart, protStartMin] = protected_.start.split(':').map(Number);
      const [protEnd, protEndMin] = protected_.end.split(':').map(Number);

      const protectedStart = new Date(date);
      protectedStart.setHours(protStart, protStartMin, 0, 0);

      const protectedEnd = new Date(date);
      protectedEnd.setHours(protEnd, protEndMin, 0, 0);

      const slotStart = new Date(remainingSlot.start).getTime();
      const slotEnd = new Date(remainingSlot.end).getTime();
      const protStartTime = protectedStart.getTime();
      const protEndTime = protectedEnd.getTime();

      // Check for overlap
      if (slotStart < protEndTime && slotEnd > protStartTime) {
        if (slotStart >= protStartTime && slotEnd <= protEndTime) {
          // Fully covered by protected time
          isFullyProtected = true;
          break;
        } else if (slotStart < protStartTime && slotEnd > protEndTime) {
          // Protected time is in the middle - split the slot
          filteredSlots.push({
            start: new Date(slotStart),
            end: protectedStart,
            available: true,
            timezone: preferences.timezone,
          });
          remainingSlot = {
            start: protectedEnd,
            end: new Date(slotEnd),
            available: true,
            timezone: preferences.timezone,
          };
        } else if (slotStart < protStartTime) {
          // Protected time covers end of slot
          remainingSlot = {
            start: new Date(slotStart),
            end: protectedStart,
            available: true,
            timezone: preferences.timezone,
          };
        } else {
          // Protected time covers start of slot
          remainingSlot = {
            start: protectedEnd,
            end: new Date(slotEnd),
            available: true,
            timezone: preferences.timezone,
          };
        }
      }
    }

    if (!isFullyProtected && new Date(remainingSlot.start) < new Date(remainingSlot.end)) {
      filteredSlots.push(remainingSlot);
    }
  }

  return filteredSlots;
}

/**
 * Calculate day schedule stats
 */
export function calculateDayStats(events: CalendarEvent[]): {
  meetingMinutes: number;
  focusMinutes: number;
  availableMinutes: number;
} {
  let meetingMinutes = 0;
  let focusMinutes = 0;

  for (const event of events) {
    if (event.isAllDay) continue;

    const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000;

    switch (event.category) {
      case 'meeting':
      case 'external':
        meetingMinutes += duration;
        break;
      case 'focus':
        focusMinutes += duration;
        break;
    }
  }

  // Assume 8-hour workday for available calculation
  const workdayMinutes = 8 * 60;
  const availableMinutes = Math.max(0, workdayMinutes - meetingMinutes - focusMinutes);

  return {
    meetingMinutes: Math.round(meetingMinutes),
    focusMinutes: Math.round(focusMinutes),
    availableMinutes: Math.round(availableMinutes),
  };
}

/**
 * Generate actionable recommendations based on schedule analysis
 */
export function generateActionableRecommendations(
  schedules: DaySchedule[],
  preferences: UserPreferences
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let recId = 1;

  if (schedules.length === 0) {
    return recommendations;
  }

  // Find large available blocks (2+ hours) for focus time
  const largeBlocks = findLargeAvailableBlocks(schedules);
  if (largeBlocks.length > 0) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'schedule_focus_time',
      priority: 'high',
      title: 'Block focus time',
      description: `You have ${largeBlocks.length} slot(s) of 2+ hours available this week`,
      impact: 'Protect your deep work time from meeting creep',
      action: {
        type: 'schedule_event',
        payload: { suggestedSlots: largeBlocks.slice(0, 3) },
        prompt: 'Block focus time during my available slots this week',
      },
    });
  }

  // Check for back-to-back meetings
  const backToBackDays = findBackToBackMeetingDays(schedules);
  if (backToBackDays.length > 0) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'add_buffer',
      priority: 'medium',
      title: 'Add meeting buffers',
      description: `You have back-to-back meetings on ${backToBackDays.join(', ')}`,
      impact: 'Add 15-min buffers to reduce stress and prepare better',
      action: {
        type: 'modify_schedule',
        payload: { days: backToBackDays },
        prompt: 'Add 15-minute buffers between my meetings this week',
      },
    });
  }

  // Check for scattered meetings (days with gaps between meetings)
  const scatteredDays = findScatteredMeetingDays(schedules);
  if (scatteredDays.length > 0) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'batch_meetings',
      priority: 'low',
      title: 'Consolidate meetings',
      description: `${scatteredDays.join(', ')} have meetings scattered throughout the day`,
      impact: 'Create longer focus blocks by batching meetings together',
      action: {
        type: 'suggest_reorganization',
        payload: { days: scatteredDays },
        prompt: 'How can I batch my meetings together to create more focus time?',
      },
    });
  }

  // Check meeting load
  const totalMeetingHours = schedules.reduce((sum, s) => sum + s.stats.meetingMinutes, 0) / 60;
  const avgMeetingHoursPerDay = totalMeetingHours / schedules.length;
  if (avgMeetingHoursPerDay > 4) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'decline_meeting',
      priority: 'high',
      title: 'Review meeting load',
      description: `You're averaging ${avgMeetingHoursPerDay.toFixed(1)} hours of meetings per day`,
      impact: 'Declining non-essential meetings could free up significant time',
      action: {
        type: 'analyze_meetings',
        payload: { threshold: 4 },
        prompt: 'Which meetings this week could I decline or make optional?',
      },
    });
  }

  // Check for very early or late meetings
  const earlyLateMeetings = findEarlyLateMeetings(schedules, preferences);
  if (earlyLateMeetings.length > 0) {
    recommendations.push({
      id: `rec-${recId++}`,
      type: 'reschedule',
      priority: 'medium',
      title: 'Reschedule off-hours meetings',
      description: `${earlyLateMeetings.length} meeting(s) are outside your working hours`,
      impact: 'Protect your work-life balance',
      action: {
        type: 'reschedule_meetings',
        payload: { meetings: earlyLateMeetings.map(m => m.id) },
        prompt: 'Help me reschedule meetings that are outside my working hours',
      },
    });
  }

  return recommendations.slice(0, 5); // Return top 5 recommendations
}

/**
 * Find available time slots of 2+ hours
 */
function findLargeAvailableBlocks(schedules: DaySchedule[]): TimeSlot[] {
  const largeBlocks: TimeSlot[] = [];

  for (const schedule of schedules) {
    for (const slot of schedule.availableSlots) {
      if (slot.available) {
        const duration = (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60000;
        if (duration >= 120) { // 2+ hours
          largeBlocks.push(slot);
        }
      }
    }
  }

  return largeBlocks;
}

/**
 * Find days with scattered meetings (large gaps between meetings)
 */
function findScatteredMeetingDays(schedules: DaySchedule[]): string[] {
  const scatteredDays: string[] = [];

  for (const schedule of schedules) {
    const meetings = schedule.events
      .filter((e) => e.category === 'meeting' || e.category === 'external')
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    if (meetings.length >= 3) {
      let hasLargeGaps = false;
      for (let i = 0; i < meetings.length - 1; i++) {
        const gap = (new Date(meetings[i + 1].start).getTime() -
          new Date(meetings[i].end).getTime()) / 60000;
        if (gap > 90) { // Gap > 1.5 hours indicates scattered meetings
          hasLargeGaps = true;
          break;
        }
      }
      if (hasLargeGaps) {
        const dayName = new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'short' });
        if (!scatteredDays.includes(dayName)) {
          scatteredDays.push(dayName);
        }
      }
    }
  }

  return scatteredDays;
}

/**
 * Find meetings outside working hours
 */
function findEarlyLateMeetings(
  schedules: DaySchedule[],
  preferences: UserPreferences
): CalendarEvent[] {
  const [workStartHour, workStartMin] = preferences.workingHours.start.split(':').map(Number);
  const [workEndHour, workEndMin] = preferences.workingHours.end.split(':').map(Number);
  const workStartMinutes = workStartHour * 60 + workStartMin;
  const workEndMinutes = workEndHour * 60 + workEndMin;

  const offHoursMeetings: CalendarEvent[] = [];

  for (const schedule of schedules) {
    for (const event of schedule.events) {
      if (event.isAllDay) continue;
      if (event.category !== 'meeting' && event.category !== 'external') continue;

      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const eventStartMinutes = startDate.getHours() * 60 + startDate.getMinutes();
      const eventEndMinutes = endDate.getHours() * 60 + endDate.getMinutes();

      if (eventStartMinutes < workStartMinutes || eventEndMinutes > workEndMinutes) {
        offHoursMeetings.push(event);
      }
    }
  }

  return offHoursMeetings;
}
