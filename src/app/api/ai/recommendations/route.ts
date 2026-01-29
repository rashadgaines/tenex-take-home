import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getEvents } from '@/lib/google/calendar';
import { generateActionableRecommendations, calculateAvailableSlots } from '@/lib/ai/analytics';
import type { UserPreferences } from '@/types/user';
import type { DaySchedule, CalendarEvent } from '@/types/calendar';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const DEFAULT_PREFERENCES: UserPreferences = {
  workingHours: { start: '09:00', end: '17:00' },
  protectedTimes: [],
  defaultMeetingDuration: 30,
  timezone: DEFAULT_TIMEZONE,
};

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as 'day' | 'week' | 'month') || 'week';

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const preferences = (user?.preferences as unknown as UserPreferences) || DEFAULT_PREFERENCES;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'day') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Fetch real events from Google Calendar
    const events = await getEvents(session.user.id, startDate, endDate);

    // Group events by day
    const schedules = groupEventsByDay(events, startDate, endDate, preferences.timezone);

    // Calculate available slots for each day
    const schedulesWithSlots = schedules.map(schedule => ({
      ...schedule,
      availableSlots: calculateAvailableSlots(schedule.events, new Date(schedule.date), preferences),
    }));

    // Generate actionable recommendations
    const recommendations = generateActionableRecommendations(schedulesWithSlots, preferences);

    return NextResponse.json({
      recommendations,
      period,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

function groupEventsByDay(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  timezone: string
): DaySchedule[] {
  const schedules: DaySchedule[] = [];
  const current = new Date(startDate);

  while (current < endDate) {
    const dayEvents = events.filter((event) => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getFullYear() === current.getFullYear() &&
        eventStart.getMonth() === current.getMonth() &&
        eventStart.getDate() === current.getDate()
      );
    });

    let meetingMinutes = 0;
    let focusMinutes = 0;

    for (const event of dayEvents) {
      const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000;
      if (event.category === 'focus') {
        focusMinutes += duration;
      } else if (event.category === 'meeting' || event.category === 'external') {
        meetingMinutes += duration;
      }
    }

    const workdayMinutes = 8 * 60;
    const availableMinutes = Math.max(0, workdayMinutes - meetingMinutes - focusMinutes);

    schedules.push({
      date: new Date(current),
      timezone,
      events: dayEvents,
      availableSlots: [],
      stats: {
        meetingMinutes,
        focusMinutes,
        availableMinutes,
      },
    });

    current.setDate(current.getDate() + 1);
  }

  return schedules;
}
