import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEvents, createEvent } from '@/lib/google/calendar';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json(
      { error: 'Missing start or end date parameters' },
      { status: 400 }
    );
  }

  try {
    const events = await getEvents(
      session.user.id,
      new Date(start),
      new Date(end)
    );
    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, start, end, attendees, location } = body;

    if (!title || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields: title, start, end' },
        { status: 400 }
      );
    }

    const event = await createEvent(session.user.id, {
      title,
      description,
      start: new Date(start),
      end: new Date(end),
      attendees,
      location,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
