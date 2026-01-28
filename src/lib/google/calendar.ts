import { google, calendar_v3 } from 'googleapis';
import { getGoogleTokens, updateGoogleTokens } from '../auth';
import type { CalendarEvent, Attendee, DaySchedule, TimeSlot } from '@/types/calendar';
import type { UserPreferences } from '@/types/user';

// Create OAuth2 client with token refresh handling
async function getCalendarClient(userId: string) {
  const tokens = await getGoogleTokens(userId);
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.access_token && newTokens.expiry_date) {
      await updateGoogleTokens(
        userId,
        newTokens.access_token,
        Math.floor(newTokens.expiry_date / 1000)
      );
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Map Google Calendar event to our CalendarEvent type
function mapGoogleEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  const attendees: Attendee[] = (event.attendees || []).map((a) => ({
    email: a.email || '',
    name: a.displayName ?? undefined,
    responseStatus: (a.responseStatus as Attendee['responseStatus']) || 'needsAction',
  }));

  // Determine category based on event properties
  let category: CalendarEvent['category'] = 'meeting';
  const title = event.summary?.toLowerCase() || '';

  if (title.includes('focus') || title.includes('heads down') || title.includes('deep work')) {
    category = 'focus';
  } else if (title.includes('personal') || title.includes('lunch') || title.includes('break')) {
    category = 'personal';
  } else if (event.organizer?.self === false) {
    category = 'external';
  }

  return {
    id: event.id || '',
    title: event.summary || 'Untitled',
    description: event.description ?? undefined,
    start: new Date(event.start?.dateTime || event.start?.date || ''),
    end: new Date(event.end?.dateTime || event.end?.date || ''),
    attendees,
    location: event.location ?? undefined,
    meetingLink: event.hangoutLink ?? event.conferenceData?.entryPoints?.[0]?.uri ?? undefined,
    isAllDay: !event.start?.dateTime,
    category,
    hasAgenda: !!(event.description && event.description.length > 50),
  };
}

// Fetch events for a date range
export async function getEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(userId);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });

  return (response.data.items || []).map(mapGoogleEvent);
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

// Create a new calendar event
export async function createEvent(
  userId: string,
  event: {
    title: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: string[];
    location?: string;
  }
): Promise<CalendarEvent> {
  const calendar = await getCalendarClient(userId);

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
      },
      end: {
        dateTime: event.end.toISOString(),
      },
      attendees: event.attendees?.map((email) => ({ email })),
      location: event.location,
      conferenceData: {
        createRequest: {
          requestId: 'meet-' + Date.now().toString(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
    conferenceDataVersion: 1,
  });

  return mapGoogleEvent(response.data);
}
