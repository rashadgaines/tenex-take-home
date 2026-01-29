import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getEvents, createEvent, deleteEvent } from '@/lib/google/calendar';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
  rateLimitedResponse,
  internalErrorResponse,
} from '@/lib/api/responses';
import { validateRequired, validateDateRange } from '@/lib/api/validation';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const timezone = searchParams.get('timezone');
    const maxResults = Math.min(parseInt(searchParams.get('maxResults') || '100', 10), 250); // Cap at 250

    // Validate required params
    const startValidation = validateRequired(start, 'start');
    if (!startValidation.valid) {
      return validationErrorResponse(startValidation.error!);
    }

    const endValidation = validateRequired(end, 'end');
    if (!endValidation.valid) {
      return validationErrorResponse(endValidation.error!);
    }

    // Validate date range
    const dateRangeValidation = validateDateRange(start, end);
    if (!dateRangeValidation.valid) {
      return validationErrorResponse(dateRangeValidation.error!);
    }

    const startDate = new Date(start!);
    const endDate = new Date(end!);

    const events = await getEvents(session.user.id, startDate, endDate, timezone || undefined);

    // Apply pagination on our side since Google Calendar API doesn't support offset-based pagination
    const paginatedEvents = events.slice(0, maxResults);
    const hasMore = events.length > maxResults;

    return successResponse({
      events: paginatedEvents,
      hasMore,
      total: events.length,
      timezone: timezone || DEFAULT_TIMEZONE
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Return appropriate status codes based on error type
    if (errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
      return unauthorizedResponse('Authentication failed');
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate_limit')) {
      return rateLimitedResponse('Service temporarily unavailable due to high demand');
    }

    if (errorMessage.includes('permissions') || errorMessage.includes('access')) {
      return forbiddenResponse('Calendar access denied. Please check permissions.');
    }

    return internalErrorResponse('Failed to fetch calendar events. Please try again.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { title, description, start, end, attendees, location, timezone } = body;

    // Validate required fields
    const titleValidation = validateRequired(title, 'title');
    if (!titleValidation.valid) {
      return validationErrorResponse(titleValidation.error!);
    }

    if (typeof title !== 'string' || !title.trim()) {
      return validationErrorResponse('Valid title is required');
    }

    // Validate start and end
    const startValidation = validateRequired(start, 'start');
    if (!startValidation.valid) {
      return validationErrorResponse('Start time is required');
    }

    const endValidation = validateRequired(end, 'end');
    if (!endValidation.valid) {
      return validationErrorResponse('End time is required');
    }

    // Validate date range
    const dateRangeValidation = validateDateRange(start, end);
    if (!dateRangeValidation.valid) {
      return validationErrorResponse(dateRangeValidation.error!);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Validate attendees array if provided
    const validAttendees = Array.isArray(attendees)
      ? attendees.filter(email => typeof email === 'string' && email.includes('@'))
      : [];

    const event = await createEvent(session.user.id, {
      title: title.trim(),
      description: description?.trim(),
      start: startDate,
      end: endDate,
      timezone: timezone,
      attendees: validAttendees,
      location: location?.trim(),
    });

    return successResponse(event, 201);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Return appropriate status codes based on error type
    if (errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
      return unauthorizedResponse('Authentication failed');
    }

    if (errorMessage.includes('permissions') || errorMessage.includes('access')) {
      return forbiddenResponse('Calendar access denied. Please check permissions.');
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate_limit')) {
      return rateLimitedResponse('Service temporarily unavailable due to high demand');
    }

    if (errorMessage.includes('Invalid event data') || errorMessage.includes('required')) {
      return validationErrorResponse(errorMessage);
    }

    return internalErrorResponse('Failed to create calendar event. Please try again.');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return validationErrorResponse('Event ID is required');
    }

    await deleteEvent(session.user.id, eventId);

    return successResponse({ success: true, message: 'Event deleted successfully' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
      return unauthorizedResponse('Authentication failed');
    }

    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return validationErrorResponse('Event not found');
    }

    if (errorMessage.includes('permissions') || errorMessage.includes('access')) {
      return forbiddenResponse('Unable to delete this event. You may not have permission.');
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate_limit')) {
      return rateLimitedResponse('Service temporarily unavailable due to high demand');
    }

    return internalErrorResponse('Failed to delete calendar event. Please try again.');
  }
}
