import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekSchedule } from '@/lib/google/calendar';
import type { UserPreferences } from '@/types/user';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const DEFAULT_PREFERENCES: UserPreferences = {
  workingHours: { start: '09:00', end: '17:00' },
  protectedTimes: [],
  defaultMeetingDuration: 30,
  timezone: DEFAULT_TIMEZONE,
};

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const preferences = (user?.preferences as unknown as UserPreferences) || DEFAULT_PREFERENCES;
    const schedule = await getWeekSchedule(session.user.id, preferences);
    
    return NextResponse.json(schedule);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch week schedule' },
      { status: 500 }
    );
  }
}
