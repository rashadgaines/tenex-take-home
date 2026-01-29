import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { processChat } from '@/lib/ai/chat/index';
import { getTodaySchedule } from '@/lib/google/calendar';
import { ChatRequest } from '@/types/ai';
import type { UserPreferences } from '@/types/user';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  rateLimitedResponse,
  externalServiceErrorResponse,
  internalErrorResponse,
  ErrorCodes,
} from '@/lib/api/responses';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const DEFAULT_PREFERENCES: UserPreferences = {
  workingHours: { start: '09:00', end: '17:00' },
  protectedTimes: [],
  defaultMeetingDuration: 30,
  timezone: DEFAULT_TIMEZONE,
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const body: ChatRequest = await request.json();

    if (!body.message || typeof body.message !== 'string') {
      return validationErrorResponse('Message is required');
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
    const response = await processChat(body, schedule, preferences, session.user.id, session.user.name || undefined);

    return successResponse(response);
  } catch (error) {
    // Return more specific error messages based on error type
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('OPENAI_API_KEY')) {
      return externalServiceErrorResponse('AI service not configured. Please contact support.');
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return rateLimitedResponse('AI service is busy. Please try again in a moment.');
    }

    if (errorMessage.includes('invalid_api_key') || errorMessage.includes('401')) {
      return externalServiceErrorResponse('AI service authentication failed. Please contact support.');
    }

    return internalErrorResponse(`Failed to process chat message: ${errorMessage}`);
  }
}
