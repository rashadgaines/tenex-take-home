import { NextRequest, NextResponse } from 'next/server';
import { calculateTimeAnalytics } from '@/lib/ai/analytics';
import { createMockSchedule } from '@/lib/ai/chat';
import { DEFAULT_USER_PREFERENCES } from '@/types/user';
import { DaySchedule } from '@/types/calendar';
import { AnalyticsRequest } from '@/types/ai';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as 'day' | 'week' | 'month') || 'week';
    const startDateParam = searchParams.get('startDate');

    // TODO: Get actual schedules from Ash's calendar API
    // For now, generate mock data for the period
    const schedules = generateMockSchedules(period, startDateParam);

    // TODO: Get user preferences from session/database
    const preferences = DEFAULT_USER_PREFERENCES;

    const analytics = calculateTimeAnalytics(schedules, period, preferences);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}

/**
 * Generate mock schedules for development
 */
function generateMockSchedules(
  period: 'day' | 'week' | 'month',
  startDateParam?: string | null
): DaySchedule[] {
  const startDate = startDateParam ? new Date(startDateParam) : new Date();
  startDate.setHours(0, 0, 0, 0);

  let days = 1;
  if (period === 'week') days = 7;
  if (period === 'month') days = 30;

  const schedules: DaySchedule[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Skip weekends for more realistic data
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    schedules.push(createMockSchedule(date));
  }

  return schedules;
}
