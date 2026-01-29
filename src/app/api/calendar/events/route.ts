import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEvents, createEvent } from '@/lib/google/calendar';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing required parameters: start and end dates' },
        { status: 400 }
      );
    }

    // Validate date format
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }

    const events = await getEvents(session.user.id, startDate, endDate);
    return NextResponse.json(events);

  } catch (error) {
    console.error('Calendar events API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Return appropriate status codes based on error type
    if (errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate_limit')) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable due to high demand' },
        { status: 429 }
      );
    }

    if (errorMessage.includes('permissions') || errorMessage.includes('access')) {
      return NextResponse.json(
        { error: 'Calendar access denied. Please check permissions.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch calendar events. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, start, end, attendees, location } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Valid title is required' },
        { status: 400 }
      );
    }

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Start and end times are required' },
        { status: 400 }
      );
    }

    // Validate date formats
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }

    // Validate attendees array if provided
    const validAttendees = Array.isArray(attendees)
      ? attendees.filter(email => typeof email === 'string' && email.includes('@'))
      : [];

    const event = await createEvent(session.user.id, {
      title: title.trim(),
      description: description?.trim(),
      start: startDate,
      end: endDate,
      attendees: validAttendees,
      location: location?.trim(),
    });

    return NextResponse.json(event, { status: 201 });

  } catch (error) {
    console.error('Event creation API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Return appropriate status codes based on error type
    if (errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('permissions') || errorMessage.includes('access')) {
      return NextResponse.json(
        { error: 'Calendar access denied. Please check permissions.' },
        { status: 403 }
      );
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate_limit')) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable due to high demand' },
        { status: 429 }
      );
    }

    if (errorMessage.includes('Invalid event data') || errorMessage.includes('required')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create calendar event. Please try again.' },
      { status: 500 }
    );
  }
}
