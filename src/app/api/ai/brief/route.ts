import { NextRequest, NextResponse } from 'next/server';
import { generateBrief, createMockSchedule } from '@/lib/ai/chat';
import { DEFAULT_USER_PREFERENCES } from '@/types/user';

export async function GET(request: NextRequest) {
  try {
    // TODO: Get actual schedule from Ash's calendar API
    const schedule = createMockSchedule();

    // TODO: Get user info from session
    const userName = 'User';
    const preferences = DEFAULT_USER_PREFERENCES;

    const brief = await generateBrief(schedule, preferences, userName);

    return NextResponse.json(brief);
  } catch (error) {
    console.error('Brief API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate brief' },
      { status: 500 }
    );
  }
}
