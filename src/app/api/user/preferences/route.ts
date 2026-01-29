import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserPreferences, updateUserPreferences } from '@/lib/user-preferences';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getUserPreferences(session.user.id);
    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate protected times structure if provided
    if (body.protectedTimes) {
      if (!Array.isArray(body.protectedTimes)) {
        return NextResponse.json(
          { error: 'protectedTimes must be an array' },
          { status: 400 }
        );
      }

      for (const pt of body.protectedTimes) {
        if (!pt.start || !pt.end || !Array.isArray(pt.days)) {
          return NextResponse.json(
            { error: 'Invalid protected time structure. Required: start, end, days' },
            { status: 400 }
          );
        }

        // Validate time format (HH:mm)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(pt.start) || !timeRegex.test(pt.end)) {
          return NextResponse.json(
            { error: 'Invalid time format. Use HH:mm format.' },
            { status: 400 }
          );
        }

        // Validate days values (0-6)
        if (!pt.days.every((d: number) => d >= 0 && d <= 6)) {
          return NextResponse.json(
            { error: 'days must contain values between 0 (Sunday) and 6 (Saturday)' },
            { status: 400 }
          );
        }
      }
    }

    // Validate working hours if provided
    if (body.workingHours) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(body.workingHours.start) || !timeRegex.test(body.workingHours.end)) {
        return NextResponse.json(
          { error: 'Invalid working hours format. Use HH:mm format.' },
          { status: 400 }
        );
      }
    }

    // Validate timezone if provided
    if (body.timezone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: body.timezone }).format();
      } catch {
        return NextResponse.json(
          { error: 'Invalid timezone' },
          { status: 400 }
        );
      }
    }

    // Validate defaultMeetingDuration if provided
    if (body.defaultMeetingDuration !== undefined) {
      if (typeof body.defaultMeetingDuration !== 'number' ||
          body.defaultMeetingDuration < 15 ||
          body.defaultMeetingDuration > 480) {
        return NextResponse.json(
          { error: 'defaultMeetingDuration must be between 15 and 480 minutes' },
          { status: 400 }
        );
      }
    }

    const updated = await updateUserPreferences(session.user.id, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
