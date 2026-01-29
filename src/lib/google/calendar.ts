import { google, calendar_v3 } from 'googleapis';
import { getGoogleTokens, updateGoogleTokens } from '../auth';
import type { CalendarEvent, Attendee, DaySchedule, TimeSlot } from '@/types/calendar';
import type { UserPreferences } from '@/types/user';

// Create OAuth2 client with token refresh handling
async function getCalendarClient(userId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const tokens = await getGoogleTokens(userId);

    if (!tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error('Invalid or missing Google OAuth tokens');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    // Handle token refresh with error handling
    oauth2Client.on('tokens', async (newTokens) => {
      try {
        if (newTokens.access_token && newTokens.expiry_date) {
          await updateGoogleTokens(
            userId,
            newTokens.access_token,
            Math.floor(newTokens.expiry_date / 1000)
          );
        }
      } catch (error) {
        console.error('Failed to update Google tokens:', error);
        // Don't throw here as it would break the calendar client
      }
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('Failed to create calendar client:', error);
    throw new Error('Unable to authenticate with Google Calendar. Please re-authenticate.');
  }
}

// Map Google Calendar event to our CalendarEvent type
function mapGoogleEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  if (!event?.id) {
    throw new Error('Invalid event: missing ID');
  }

  // Validate and map attendees with proper email validation
  const attendees: Attendee[] = (event.attendees || [])
    .filter((a) => a?.email && typeof a.email === 'string' && a.email.includes('@'))
    .map((a) => ({
      email: a.email!,
      name: a.displayName ?? undefined,
      responseStatus: (a.responseStatus as Attendee['responseStatus']) || 'needsAction',
    }));

  // Determine category based on event properties with better logic
  let category: CalendarEvent['category'] = 'meeting';
  const title = (event.summary || '').toLowerCase();
  const description = (event.description || '').toLowerCase();

  // Check for focus/deep work indicators
  if (title.includes('focus') || title.includes('heads down') || title.includes('deep work') ||
      title.includes('no meetings') || title.includes('do not disturb')) {
    category = 'focus';
  }
  // Check for personal indicators
  else if (title.includes('personal') || title.includes('lunch') || title.includes('break') ||
           title.includes('vacation') || title.includes('pto') || title.includes('holiday')) {
    category = 'personal';
  }
  // External meetings (not organized by self)
  else if (event.organizer?.self === false) {
    category = 'external';
  }

  // Validate and parse dates
  const startDateTime = event.start?.dateTime || event.start?.date;
  const endDateTime = event.end?.dateTime || event.end?.date;

  if (!startDateTime || !endDateTime) {
    throw new Error(`Invalid event dates for event ${event.id}`);
  }

  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error(`Invalid date format for event ${event.id}`);
  }

  // Extract meeting link from various sources
  let meetingLink: string | undefined;
  if (event.hangoutLink) {
    meetingLink = event.hangoutLink;
  } else if (event.conferenceData?.entryPoints) {
    const meetEntry = event.conferenceData.entryPoints.find(
      (entry) => entry.uri && (entry.uri.includes('meet.google') || entry.uri.includes('hangouts'))
    );
    meetingLink = meetEntry?.uri;
  }

  return {
    id: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description || undefined,
    start,
    end,
    attendees,
    location: event.location || undefined,
    meetingLink,
    isAllDay: !event.start?.dateTime,
    category,
    hasAgenda: !!(event.description && event.description.length > 50),
  };
}

// Fetch events for a date range with error handling and retry logic
export async function getEvents(
  userId: string,
  startDate: Date,
  endDate: Date,
  maxRetries: number = 3
): Promise<CalendarEvent[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    throw new Error('Valid start and end dates are required');
  }

  if (startDate >= endDate) {
    throw new Error('Start date must be before end date');
  }

  // Limit date range to prevent excessive API calls
  const maxRangeDays = 90; // 3 months
  const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (rangeDays > maxRangeDays) {
    throw new Error(`Date range too large. Maximum ${maxRangeDays} days allowed.`);
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const calendar = await getCalendarClient(userId);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250, // Google Calendar API limit
        showDeleted: false,
        q: undefined, // No search query
      });

      if (!response.data?.items) {
        console.warn('No events returned from Google Calendar API');
        return [];
      }

      // Map events with error handling for individual events
      const validEvents: CalendarEvent[] = [];
      for (const event of response.data.items) {
        try {
          const mappedEvent = mapGoogleEvent(event);
          validEvents.push(mappedEvent);
        } catch (mappingError) {
          console.warn(`Failed to map event ${event.id}:`, mappingError);
          // Continue with other events
        }
      }

      return validEvents;

    } catch (error) {
      lastError = error as Error;
      console.error(`Calendar API attempt ${attempt}/${maxRetries} failed:`, error);

      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('access_denied') || error.message.includes('invalid_grant')) {
          throw new Error('Google Calendar access denied. Please re-authenticate.');
        }
        if (error.message.includes('quota') || error.message.includes('rate_limit')) {
          throw new Error('Google Calendar API quota exceeded. Please try again later.');
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to fetch calendar events after ${maxRetries} attempts: ${lastError?.message}`);
}

// Get today's schedule
export async function getTodaySchedule(
  userId: string,
  preferences: UserPreferences
): Promise<DaySchedule> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const events = await getEvents(userId, today, tomorrow);
  const availableSlots = calculateAvailableSlots(events, today, preferences);
  const stats = calculateDayStats(events, availableSlots, preferences);

  return {
    date: today,
    events,
    availableSlots,
    stats,
  };
}

// Get current week's schedule
export async function getWeekSchedule(
  userId: string,
  preferences: UserPreferences
): Promise<DaySchedule[]> {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const events = await getEvents(userId, startOfWeek, endOfWeek);
  const schedules: DaySchedule[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    
    const dayEvents = events.filter((e) => {
      const eventDate = new Date(e.start);
      return eventDate.toDateString() === date.toDateString();
    });

    const availableSlots = calculateAvailableSlots(dayEvents, date, preferences);
    const stats = calculateDayStats(dayEvents, availableSlots, preferences);

    schedules.push({
      date,
      events: dayEvents,
      availableSlots,
      stats,
    });
  }

  return schedules;
}

// Calculate available time slots for a day
export function calculateAvailableSlots(
  events: CalendarEvent[],
  date: Date,
  preferences: UserPreferences
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const dayOfWeek = date.getDay();

  // Parse working hours
  const [startHour, startMin] = preferences.workingHours.start.split(':').map(Number);
  const [endHour, endMin] = preferences.workingHours.end.split(':').map(Number);

  const workStart = new Date(date);
  workStart.setHours(startHour, startMin, 0, 0);

  const workEnd = new Date(date);
  workEnd.setHours(endHour, endMin, 0, 0);

  // Filter out protected times for this day
  const protectedTimes = preferences.protectedTimes.filter((pt) =>
    pt.days.includes(dayOfWeek)
  );

  // Get all blocked time ranges (events + protected times)
  const blockedRanges: { start: Date; end: Date }[] = [
    ...events.map((e) => ({ start: new Date(e.start), end: new Date(e.end) })),
    ...protectedTimes.map((pt) => {
      const [ptStartH, ptStartM] = pt.start.split(':').map(Number);
      const [ptEndH, ptEndM] = pt.end.split(':').map(Number);
      
      const ptStart = new Date(date);
      ptStart.setHours(ptStartH, ptStartM, 0, 0);
      
      const ptEnd = new Date(date);
      ptEnd.setHours(ptEndH, ptEndM, 0, 0);
      
      return { start: ptStart, end: ptEnd };
    }),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Find gaps between blocked ranges within working hours
  let cursor = workStart;

  for (const range of blockedRanges) {
    if (range.start > cursor && range.start < workEnd) {
      const slotEnd = range.start < workEnd ? range.start : workEnd;
      if (cursor < slotEnd) {
        slots.push({
          start: new Date(cursor),
          end: new Date(slotEnd),
          available: true,
        });
      }
    }
    if (range.end > cursor) {
      cursor = range.end;
    }
  }

  // Add remaining time until work end
  if (cursor < workEnd) {
    slots.push({
      start: new Date(cursor),
      end: new Date(workEnd),
      available: true,
    });
  }

  return slots;
}

// Calculate day statistics
function calculateDayStats(
  events: CalendarEvent[],
  availableSlots: TimeSlot[],
  _preferences: UserPreferences
) {
  let meetingMinutes = 0;
  let focusMinutes = 0;

  for (const event of events) {
    const duration = (event.end.getTime() - event.start.getTime()) / 60000;
    if (event.category === 'focus') {
      focusMinutes += duration;
    } else if (event.category === 'meeting' || event.category === 'external') {
      meetingMinutes += duration;
    }
  }

  const availableMinutes = availableSlots.reduce((acc, slot) => {
    return acc + (slot.end.getTime() - slot.start.getTime()) / 60000;
  }, 0);

  return {
    meetingMinutes,
    focusMinutes,
    availableMinutes,
  };
}

// Get available slots for scheduling
export async function getAvailability(
  userId: string,
  startDate: Date,
  endDate: Date,
  durationMinutes: number,
  preferences: UserPreferences,
  respectProtectedTime: boolean = true
): Promise<TimeSlot[]> {
  const events = await getEvents(userId, startDate, endDate);
  const availableSlots: TimeSlot[] = [];

  const current = new Date(startDate);
  while (current < endDate) {
    const dayEvents = events.filter((e) => {
      const eventDate = new Date(e.start);
      return eventDate.toDateString() === current.toDateString();
    });

    const effectivePrefs = respectProtectedTime
      ? preferences
      : { ...preferences, protectedTimes: [] };

    const daySlots = calculateAvailableSlots(dayEvents, current, effectivePrefs);

    // Filter slots that are long enough for the requested duration
    for (const slot of daySlots) {
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / 60000;
      if (slotDuration >= durationMinutes) {
        availableSlots.push(slot);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return availableSlots;
}

// Create a new calendar event with comprehensive validation
export async function createEvent(
  userId: string,
  event: {
    title: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: string[];
    location?: string;
  },
  maxRetries: number = 3
): Promise<CalendarEvent> {
  // Input validation
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!event?.title?.trim()) {
    throw new Error('Event title is required');
  }

  if (!(event.start instanceof Date) || !(event.end instanceof Date)) {
    throw new Error('Valid start and end dates are required');
  }

  if (isNaN(event.start.getTime()) || isNaN(event.end.getTime())) {
    throw new Error('Invalid date format');
  }

  if (event.start >= event.end) {
    throw new Error('Event start time must be before end time');
  }

  // Validate duration (max 8 hours)
  const durationMs = event.end.getTime() - event.start.getTime();
  const maxDurationMs = 8 * 60 * 60 * 1000; // 8 hours
  if (durationMs > maxDurationMs) {
    throw new Error('Event duration cannot exceed 8 hours');
  }

  // Validate attendees
  const validAttendees = (event.attendees || [])
    .filter((email): email is string => {
      if (typeof email !== 'string') return false;
      if (!email.includes('@')) return false;
      if (email.length < 5 || email.length > 254) return false;
      // Basic email regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    });

  // Check for duplicate attendees
  const uniqueAttendees = [...new Set(validAttendees)];

  if (uniqueAttendees.length !== validAttendees.length) {
    console.warn('Duplicate attendees removed from event creation');
  }

  // Validate title length
  const title = event.title.trim();
  if (title.length > 1000) {
    throw new Error('Event title is too long (maximum 1000 characters)');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const calendar = await getCalendarClient(userId);

      // Prepare request body
      const requestBody: any = {
        summary: title,
        description: event.description?.trim() || undefined,
        start: {
          dateTime: event.start.toISOString(),
        },
        end: {
          dateTime: event.end.toISOString(),
        },
      };

      // Add attendees if any
      if (uniqueAttendees.length > 0) {
        requestBody.attendees = uniqueAttendees.map(email => ({ email }));
      }

      // Add location if provided
      if (event.location?.trim()) {
        requestBody.location = event.location.trim();
      }

      // Try to create Google Meet conference (optional)
      try {
        requestBody.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      } catch (conferenceError) {
        console.warn('Could not create Google Meet conference:', conferenceError);
        // Continue without conference
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody,
        conferenceDataVersion: requestBody.conferenceData ? 1 : undefined,
        sendUpdates: uniqueAttendees.length > 0 ? 'all' : 'none', // Send invites if there are attendees
      });

      if (!response.data) {
        throw new Error('No event data returned from Google Calendar API');
      }

      return mapGoogleEvent(response.data);

    } catch (error) {
      lastError = error as Error;
      console.error(`Event creation attempt ${attempt}/${maxRetries} failed:`, error);

      // Check for specific error types
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('access_denied') || message.includes('insufficient_permissions')) {
          throw new Error('Insufficient permissions to create calendar events. Please check your Google Calendar access.');
        }

        if (message.includes('quota') || message.includes('rate_limit')) {
          throw new Error('Google Calendar API quota exceeded. Please try again later.');
        }

        if (message.includes('invalid_request') || message.includes('invalid_value')) {
          throw new Error('Invalid event data. Please check your input and try again.');
        }

        if (message.includes('forbidden') || message.includes('permission')) {
          throw new Error('Unable to create event. Please check your calendar permissions.');
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to create calendar event after ${maxRetries} attempts: ${lastError?.message}`);
}
