import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { processChat } from '@/lib/ai/chat';
import { getTodaySchedule } from '@/lib/google/calendar';
import { ChatRequest } from '@/types/ai';
import type { UserPreferences } from '@/types/user';

const DEFAULT_PREFERENCES: UserPreferences = {
  workingHours: { start: '09:00', end: '17:00' },
  protectedTimes: [],
  defaultMeetingDuration: 30,
  timezone: 'America/Los_Angeles',
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ChatRequest = await request.json();

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const preferences = (user?.preferences as unknown as UserPreferences) || DEFAULT_PREFERENCES;

    // Fetch real calendar data (with fallback if calendar access fails)
    let schedule;
    try {
      schedule = await getTodaySchedule(session.user.id, preferences);
    } catch (calendarError) {
      console.error('Failed to fetch calendar, using empty schedule:', calendarError);
      // Provide empty schedule so chat can still work
      schedule = {
        date: new Date(),
        timezone: preferences.timezone,
        events: [],
        availableSlots: [],
        stats: { meetingMinutes: 0, focusMinutes: 0, availableMinutes: 480 },
      };
    }

    // Process the chat message with real data
    const response = await processChat(body, schedule, preferences, session.user.id);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);

    // Return more specific error messages for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured. Please contact support.' },
        { status: 503 }
      );
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        { error: 'AI service is busy. Please try again in a moment.' },
        { status: 429 }
      );
    }

    if (errorMessage.includes('invalid_api_key') || errorMessage.includes('401')) {
      return NextResponse.json(
        { error: 'AI service authentication failed. Please contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Failed to process chat message: ${errorMessage}` },
      { status: 500 }
    );
  }
}
