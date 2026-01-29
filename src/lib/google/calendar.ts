import { google, calendar_v3 } from 'googleapis';
import { getGoogleTokens, updateGoogleTokens } from '../auth';
import type { CalendarEvent, Attendee, DaySchedule, TimeSlot } from '@/types/calendar';
import type { UserPreferences } from '@/types/user';
import {
  parseGoogleDate,
  formatForGoogleCalendar,
  startOfDayInTimezone,
  endOfDayInTimezone,
  isSameDayInTimezone,
  toUtcISOString,
  DEFAULT_TIMEZONE
} from '../date-utils';
import { getUserTimezone } from '../user-preferences';

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
async function mapGoogleEvent(event: calendar_v3.Schema$Event, userId: string): Promise<CalendarEvent> {
  if (!event?.id) {
    throw new Error('Invalid event: missing ID');
  }

  // Get user's timezone for proper date parsing
  const userTimezone = await getUserTimezone(userId);

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

  // Parse dates using timezone-aware parsing
  let start: Date;
  let end: Date;
  let isAllDay: boolean;

  try {
    if (event.start?.dateTime) {
      // Timed event - Google provides ISO string with timezone
      start = new Date(event.start.dateTime);
      end = new Date(event.end?.dateTime || '');
      isAllDay = false;
    } else if (event.start?.date) {
      // All-day event - Google provides date string (YYYY-MM-DD)
      // Use UTC noon to prevent day boundary issues across timezones
      // Noon UTC stays on the same calendar day for all timezones from UTC-12 to UTC+12
      start = new Date(`${event.start.date}T12:00:00Z`);
      const endDateStr = event.end?.date || event.start.date;
      end = new Date(`${endDateStr}T12:00:00Z`);
      isAllDay = true;
    } else {
      throw new Error('Invalid event dates: no dateTime or date provided');
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }
  } catch (error) {
    throw new Error(`Invalid date format for event ${event.id}: ${error}`);
  }

  // Extract meeting link from various sources
  let meetingLink: string | undefined;
  if (event.hangoutLink) {
    meetingLink = event.hangoutLink;
  } else if (event.conferenceData?.entryPoints) {
    const meetEntry = event.conferenceData.entryPoints.find(
      (entry) => entry.uri && (entry.uri.includes('meet.google') || entry.uri.includes('hangouts'))
    );
    meetingLink = meetEntry?.uri ?? undefined;
  }

  return {
    id: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description || undefined,
    start, // UTC Date
    end, // UTC Date
    timezone: userTimezone,
    attendees,
    location: event.location || undefined,
    meetingLink,
    isAllDay,
    category,
    hasAgenda: !!(event.description && event.description.length > 50),
    calendarId: 'primary', // Default to primary calendar
    recurrence: event.recurrence || [],
  };
}

// Fetch events for a date range with error handling and retry logic
export async function getEvents(
  userId: string,
  startDate: Date,
  endDate: Date,
  timezone?: string,
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

  // Get user's timezone if not provided
  const userTimezone = timezone || await getUserTimezone(userId);

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
        timeMin: toUtcISOString(startDate, userTimezone),
        timeMax: toUtcISOString(endDate, userTimezone),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250, // Google Calendar API limit
        showDeleted: false,
        q: undefined, // No search query
        timeZone: userTimezone, // Request events in user's timezone
      });

      if (!response.data?.items) {
        console.warn('No events returned from Google Calendar API');
        return [];
      }

      // Map events with error handling for individual events
      const validEvents: CalendarEvent[] = [];
      for (const event of response.data.items) {
        try {
          const mappedEvent = await mapGoogleEvent(event, userId);
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
  const userTimezone = preferences.timezone;
  const today = startOfDayInTimezone(new Date(), userTimezone);
  const tomorrow = endOfDayInTimezone(new Date(), userTimezone);

  const events = await getEvents(userId, today, tomorrow, userTimezone);
  const availableSlots = calculateAvailableSlots(events, today, preferences);
  const stats = calculateDayStats(events, availableSlots, preferences);

  return {
    date: today,
    timezone: userTimezone,
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
  const userTimezone = preferences.timezone;
  const today = new Date();
  const weekStartsOn = 0; // 0 = Sunday

  // Calculate start of week in user's timezone
  const zonedToday = new Date(today.toLocaleString('en-US', { timeZone: userTimezone }));
  const startOfWeek = new Date(zonedToday);
  startOfWeek.setDate(zonedToday.getDate() - zonedToday.getDay() + weekStartsOn);
  startOfWeek.setHours(0, 0, 0, 0);

  // Convert back to UTC for API calls
  const startOfWeekUtc = startOfDayInTimezone(startOfWeek, userTimezone);
  const endOfWeekUtc = new Date(startOfWeekUtc);
  endOfWeekUtc.setDate(startOfWeekUtc.getDate() + 7);

  const events = await getEvents(userId, startOfWeekUtc, endOfWeekUtc, userTimezone);
  const schedules: DaySchedule[] = [];

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(startOfWeekUtc);
    dayStart.setDate(startOfWeekUtc.getDate() + i);
    const dayEnd = endOfDayInTimezone(dayStart, userTimezone);

    // Filter events for this day using timezone-aware comparison
    const dayEvents = events.filter((event) =>
      isSameDayInTimezone(event.start, dayStart, userTimezone)
    );

    const availableSlots = calculateAvailableSlots(dayEvents, dayStart, preferences);
    const stats = calculateDayStats(dayEvents, availableSlots, preferences);

    schedules.push({
      date: dayStart,
      timezone: userTimezone,
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
  const userTimezone = preferences.timezone;

  // Get the day of week in user's timezone
  const zonedDate = new Date(date.toLocaleString('en-US', { timeZone: userTimezone }));
  const dayOfWeek = zonedDate.getDay();

  // Parse working hours and create timezone-aware Date objects
  const [startHour, startMin] = preferences.workingHours.start.split(':').map(Number);
  const [endHour, endMin] = preferences.workingHours.end.split(':').map(Number);

  // Create working hours in user's timezone
  const workStartStr = `${date.toISOString().split('T')[0]}T${preferences.workingHours.start}:00`;
  const workEndStr = `${date.toISOString().split('T')[0]}T${preferences.workingHours.end}:00`;

  const workStart = new Date(workStartStr);
  const workEnd = new Date(workEndStr);

  // Filter out protected times for this day
  const protectedTimes = preferences.protectedTimes.filter((pt) =>
    pt.days.includes(dayOfWeek)
  );

  // Get all blocked time ranges (events + protected times)
  // Exclude all-day events from blocking time slots
  const timedEvents = events.filter(e => !e.isAllDay);
  const blockedRanges: { start: Date; end: Date }[] = [
    ...timedEvents.map((e) => ({ start: new Date(e.start), end: new Date(e.end) })),
    ...protectedTimes.map((pt) => {
      const ptStartStr = `${date.toISOString().split('T')[0]}T${pt.start}:00`;
      const ptEndStr = `${date.toISOString().split('T')[0]}T${pt.end}:00`;

      return {
        start: new Date(ptStartStr),
        end: new Date(ptEndStr)
      };
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
          timezone: userTimezone,
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
      timezone: userTimezone,
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
  const userTimezone = preferences.timezone;
  const events = await getEvents(userId, startDate, endDate, userTimezone);
  const availableSlots: TimeSlot[] = [];

  const current = new Date(startDate);
  while (current < endDate) {
    // Filter events for this day using timezone-aware comparison
    const dayEvents = events.filter((event) =>
      isSameDayInTimezone(event.start, current, userTimezone)
    );

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
    timezone?: string;
    attendees?: string[];
    location?: string;
    isAllDay?: boolean;
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

  // Get user's timezone
  const userTimezone = event.timezone || await getUserTimezone(userId);

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

      // Prepare request body with timezone information
      const requestBody: any = {
        summary: title,
        description: event.description?.trim() || undefined,
      };

      // Format start and end times with timezone
      const googleStart = formatForGoogleCalendar(event.start, event.isAllDay, userTimezone);
      const googleEnd = formatForGoogleCalendar(event.end, event.isAllDay, userTimezone);

      requestBody.start = googleStart;
      requestBody.end = googleEnd;

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

      return await mapGoogleEvent(response.data, userId);

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
