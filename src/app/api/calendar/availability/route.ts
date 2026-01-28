import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAvailability } from '@/lib/google/calendar';
import type { UserPreferences } from '@/types/user';

const DEFAULT_PREFERENCES: UserPreferences = {
  workingHours: { start: '09:00', end: '17:00' },
  protectedTimes: [],
  defaultMeetingDuration: 30,
  timezone: 'America/Los_Angeles',
};

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const duration = searchParams.get('duration');
  const respectProtectedTime = searchParams.get('respectProtectedTime') !== 'false';

  if (!start || !end) {
    return NextResponse.json(
      { error: 'Missing start or end date parameters' },
      { status: 400 }
    );
  }

  try {
    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const preferences = (user?.preferences as unknown as UserPreferences) || DEFAULT_PREFERENCES;
    const durationMinutes = duration ? parseInt(duration, 10) : preferences.defaultMeetingDuration;

    const slots = await getAvailability(
      session.user.id,
      new Date(start),
      new Date(end),
      durationMinutes,
      preferences,
      respectProtectedTime
    );
    
    return NextResponse.json(slots);
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
