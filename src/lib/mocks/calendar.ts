import { CalendarEvent, DaySchedule, TimeSlot } from '@/types';

const today = new Date();
const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Design Review',
    description: 'Review the new calendar assistant designs',
    start: addHours(startOfDay, 10),
    end: addHours(startOfDay, 11),
    attendees: [
      { email: 'joe@company.com', name: 'Joe Chen', responseStatus: 'accepted' },
      { email: 'sarah@company.com', name: 'Sarah Kim', responseStatus: 'accepted' },
    ],
    location: 'Conference Room A',
    isAllDay: false,
    category: 'meeting',
    hasAgenda: true,
  },
  {
    id: '2',
    title: 'Team Standup',
    description: 'Daily sync with the team',
    start: addHours(startOfDay, 14),
    end: addHours(startOfDay, 14.5),
    attendees: [
      { email: 'dan@company.com', name: 'Dan Rodriguez', responseStatus: 'accepted' },
      { email: 'sally@company.com', name: 'Sally Park', responseStatus: 'tentative' },
    ],
    isAllDay: false,
    category: 'meeting',
    hasAgenda: false,
  },
  {
    id: '3',
    title: 'Client Call',
    description: 'Quarterly review with Acme Corp',
    start: addHours(startOfDay, 16),
    end: addHours(startOfDay, 17.5),
    attendees: [
      { email: 'client@acme.com', name: 'Alex Johnson', responseStatus: 'accepted' },
    ],
    meetingLink: 'https://zoom.us/j/123456789',
    isAllDay: false,
    category: 'external',
    hasAgenda: true,
  },
  {
    id: '4',
    title: 'Morning Focus Time',
    start: addHours(addDays(startOfDay, 1), 9),
    end: addHours(addDays(startOfDay, 1), 11),
    attendees: [],
    isAllDay: false,
    category: 'focus',
    hasAgenda: false,
  },
  {
    id: '5',
    title: '1:1 with Sarah',
    description: 'Weekly check-in',
    start: addHours(addDays(startOfDay, 2), 10),
    end: addHours(addDays(startOfDay, 2), 10.5),
    attendees: [
      { email: 'sarah@company.com', name: 'Sarah Kim', responseStatus: 'accepted' },
    ],
    isAllDay: false,
    category: 'meeting',
    hasAgenda: true,
  },
];

export const mockAvailableSlots: TimeSlot[] = [
  { start: addHours(startOfDay, 11), end: addHours(startOfDay, 12), available: true },
  { start: addHours(startOfDay, 12), end: addHours(startOfDay, 14), available: true },
  { start: addHours(startOfDay, 14.5), end: addHours(startOfDay, 16), available: true },
  { start: addHours(addDays(startOfDay, 1), 14), end: addHours(addDays(startOfDay, 1), 17), available: true },
  { start: addHours(addDays(startOfDay, 2), 14), end: addHours(addDays(startOfDay, 2), 17), available: true },
];

export const mockTodaySchedule: DaySchedule = {
  date: today,
  events: mockEvents.filter((e) => {
    const eventDate = e.start;
    return (
      eventDate.getFullYear() === today.getFullYear() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getDate() === today.getDate()
    );
  }),
  availableSlots: mockAvailableSlots.filter((s) => {
    const slotDate = s.start;
    return (
      slotDate.getFullYear() === today.getFullYear() &&
      slotDate.getMonth() === today.getMonth() &&
      slotDate.getDate() === today.getDate()
    );
  }),
  stats: {
    meetingMinutes: 180,
    focusMinutes: 0,
    availableMinutes: 270,
  },
};

export function getEventsForDate(date: Date): CalendarEvent[] {
  return mockEvents.filter((e) => {
    const eventDate = e.start;
    return (
      eventDate.getFullYear() === date.getFullYear() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getDate() === date.getDate()
    );
  });
}

export function getWeekEvents(): CalendarEvent[] {
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = addDays(weekStart, 7);

  return mockEvents.filter((e) => e.start >= weekStart && e.start < weekEnd);
}
