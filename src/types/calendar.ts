export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: Attendee[];
  location?: string;
  meetingLink?: string;
  isAllDay: boolean;
  category: 'meeting' | 'focus' | 'personal' | 'external';
  hasAgenda: boolean;
}

export interface Attendee {
  email: string;
  name?: string;
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface DaySchedule {
  date: Date;
  events: CalendarEvent[];
  availableSlots: TimeSlot[];
  stats: {
    meetingMinutes: number;
    focusMinutes: number;
    availableMinutes: number;
  };
}
