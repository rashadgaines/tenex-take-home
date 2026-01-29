export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date; // UTC Date object
  end: Date; // UTC Date object
  timezone: string; // IANA timezone identifier (e.g., 'America/New_York')
  attendees: Attendee[];
  location?: string;
  meetingLink?: string;
  isAllDay: boolean;
  category: 'meeting' | 'focus' | 'personal' | 'external';
  hasAgenda: boolean;
  calendarId?: string; // Google Calendar ID
  recurrence?: string[]; // Recurrence rules
}

export interface Attendee {
  email: string;
  name?: string;
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

export interface TimeSlot {
  start: Date; // UTC Date object
  end: Date; // UTC Date object
  available: boolean;
  timezone: string; // IANA timezone identifier
}

export interface DaySchedule {
  date: Date; // UTC Date object representing the day
  timezone: string; // IANA timezone identifier
  events: CalendarEvent[];
  availableSlots: TimeSlot[];
  stats: {
    meetingMinutes: number;
    focusMinutes: number;
    availableMinutes: number;
  };
}

export interface CalendarApiRequest {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  timezone?: string; // IANA timezone identifier
  calendarId?: string; // Specific calendar ID to fetch from
}

export interface CalendarApiResponse {
  events: CalendarEvent[];
  timezone: string;
  hasMore?: boolean; // For pagination
  total?: number; // Total events available
}

export interface AvailabilityRequest {
  date: string; // ISO date string
  timezone: string; // IANA timezone identifier
  workingHours?: {
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
}

export interface EventCreationRequest {
  title: string;
  description?: string;
  start: string; // ISO datetime string
  end: string; // ISO datetime string
  timezone: string; // IANA timezone identifier
  attendees?: string[]; // Email addresses
  location?: string;
  isAllDay?: boolean;
  category?: CalendarEvent['category'];
}
