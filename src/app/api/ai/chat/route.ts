import { NextRequest, NextResponse } from 'next/server';
import { processChat, createMockSchedule } from '@/lib/ai/chat';
import { ChatRequest } from '@/types/ai';
import { DEFAULT_USER_PREFERENCES } from '@/types/user';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // TODO: Get actual schedule from Ash's calendar API
    // For now, use mock data
    const schedule = createMockSchedule();

    // TODO: Get user preferences from session/database
    const preferences = DEFAULT_USER_PREFERENCES;

    const response = await processChat(body, schedule, preferences);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
