'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainCanvas } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { CalendarEvent, DaySchedule } from '@/types';
import { getClientTimezone, startOfDayInTimezone } from '@/lib/date-utils';

function formatTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
}

// Get the date string (YYYY-MM-DD) for an event in the specified timezone
function getEventDateString(event: CalendarEvent, timezone: string): string {
  if (event.isAllDay) {
    // All-day events: extract date directly from the ISO string (stored as noon UTC)
    // The date portion is the intended calendar date
    return event.start.toISOString().split('T')[0];
  }
  // Timed events: convert to target timezone and get the date
  return event.start.toLocaleDateString('en-CA', { timeZone: timezone }); // en-CA gives YYYY-MM-DD format
}

// Get the date string (YYYY-MM-DD) for a day column
function getDayDateString(day: Date): string {
  // Day is created in local timezone, get its local date
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function getWeekDays(baseDate: Date, weekStartsOn: number = 0): Date[] {
  const days: Date[] = [];
  const zonedBaseDate = new Date(baseDate.toLocaleString('en-US', { timeZone: getClientTimezone() }));

  // Calculate start of week in user's timezone
  const startOfWeek = new Date(zonedBaseDate);
  startOfWeek.setDate(zonedBaseDate.getDate() - zonedBaseDate.getDay() + weekStartsOn);
  startOfWeek.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
}

const categoryColors: Record<CalendarEvent['category'], { bg: string; border: string; text: string }> = {
  meeting: { bg: 'bg-[var(--meeting-internal)]', border: 'border-l-[var(--meeting-internal-border)]', text: 'text-[var(--text-primary)]' },
  external: { bg: 'bg-[var(--meeting-external)]', border: 'border-l-[var(--meeting-external-border)]', text: 'text-[var(--text-primary)]' },
  focus: { bg: 'bg-[var(--meeting-focus)]', border: 'border-l-[var(--meeting-focus-border)]', text: 'text-[var(--text-primary)]' },
  personal: { bg: 'bg-[var(--meeting-personal)]', border: 'border-l-[var(--meeting-personal-border)]', text: 'text-[var(--text-primary)]' },
};

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

interface NewEventForm {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
}

const initialFormState: NewEventForm = {
  title: '',
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  description: '',
  location: '',
};

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>('America/Los_Angeles');

  // Create event modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventForm, setNewEventForm] = useState<NewEventForm>(initialFormState);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Initialize user timezone on mount
  useEffect(() => {
    setUserTimezone(getClientTimezone());
  }, []);

  const weekDays = getWeekDays(currentDate);

  // Fetch calendar data
  useEffect(() => {
    async function fetchCalendar() {
      try {
        setIsLoading(true);
        setError(null);

        // Calculate week start/end for the API using timezone-aware dates
        const startOfWeek = startOfDayInTimezone(
          new Date(currentDate.toLocaleString('en-US', { timeZone: userTimezone })),
          userTimezone
        );
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday start

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const response = await fetch(
          `/api/calendar/events?start=${startOfWeek.toISOString()}&end=${endOfWeek.toISOString()}&timezone=${encodeURIComponent(userTimezone)}`
        );

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch calendar');
        }

        const data = await response.json();
        const events = data.events || [];

        // Parse dates and organize by day
        const parsedEvents: CalendarEvent[] = events.map((event: CalendarEvent) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));

        // Group events by day using date string comparison
        const scheduleByDay: DaySchedule[] = weekDays.map((day) => {
          const dayDateStr = getDayDateString(day);
          const dayEvents = parsedEvents.filter((event) => {
            const eventDateStr = getEventDateString(event, userTimezone);
            return eventDateStr === dayDateStr;
          });

          return {
            date: day,
            timezone: userTimezone,
            events: dayEvents,
            availableSlots: [],
            stats: { meetingMinutes: 0, focusMinutes: 0, availableMinutes: 0 },
          };
        });

        setWeekSchedule(scheduleByDay);
      } catch (err) {
        console.error('Failed to fetch calendar:', err);
        setError('Unable to load calendar. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCalendar();
  }, [currentDate, router, userTimezone]);

  // Navigation handlers
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Open create modal with optional pre-filled date
  const openCreateModal = (date?: Date) => {
    const targetDate = date || new Date();
    setNewEventForm({
      ...initialFormState,
      date: getDayDateString(targetDate),
    });
    setCreateError(null);
    setShowCreateModal(true);
  };

  // Handle form field changes
  const handleFormChange = (field: keyof NewEventForm, value: string) => {
    setNewEventForm(prev => ({ ...prev, [field]: value }));
    setCreateError(null);
  };

  // Create event handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Validation
    if (!newEventForm.title.trim()) {
      setCreateError('Title is required');
      return;
    }
    if (!newEventForm.date) {
      setCreateError('Date is required');
      return;
    }
    if (!newEventForm.startTime || !newEventForm.endTime) {
      setCreateError('Start and end times are required');
      return;
    }
    if (newEventForm.startTime >= newEventForm.endTime) {
      setCreateError('End time must be after start time');
      return;
    }

    setIsCreating(true);

    try {
      // Construct ISO datetime strings
      const startDateTime = `${newEventForm.date}T${newEventForm.startTime}:00`;
      const endDateTime = `${newEventForm.date}T${newEventForm.endTime}:00`;

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEventForm.title.trim(),
          description: newEventForm.description.trim() || undefined,
          start: startDateTime,
          end: endDateTime,
          timezone: userTimezone,
          location: newEventForm.location.trim() || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to create event');
      }

      // Success - close modal and refresh calendar
      setShowCreateModal(false);
      setNewEventForm(initialFormState);

      // Refresh the calendar to show the new event
      setIsLoading(true);
      const startOfWeek = startOfDayInTimezone(
        new Date(currentDate.toLocaleString('en-US', { timeZone: userTimezone })),
        userTimezone
      );
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const refreshResponse = await fetch(
        `/api/calendar/events?start=${startOfWeek.toISOString()}&end=${endOfWeek.toISOString()}&timezone=${encodeURIComponent(userTimezone)}`
      );
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const events = data.events || [];
        const parsedEvents: CalendarEvent[] = events.map((event: CalendarEvent) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        const scheduleByDay: DaySchedule[] = weekDays.map((day) => {
          const dayDateStr = getDayDateString(day);
          const dayEvents = parsedEvents.filter((event) => {
            const eventDateStr = getEventDateString(event, userTimezone);
            return eventDateStr === dayDateStr;
          });
          return {
            date: day,
            timezone: userTimezone,
            events: dayEvents,
            availableSlots: [],
            stats: { meetingMinutes: 0, focusMinutes: 0, availableMinutes: 0 },
          };
        });
        setWeekSchedule(scheduleByDay);
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to create event:', err);
      setCreateError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const targetDateStr = getDayDateString(date);
    const daySchedule = weekSchedule.find((schedule) =>
      getDayDateString(schedule.date) === targetDateStr
    );
    return daySchedule?.events || [];
  };

  const getEventPosition = (event: CalendarEvent): { top: number; height: number } => {
    // Convert event times to user's timezone for positioning
    const startInTimezone = new Date(event.start.toLocaleString('en-US', { timeZone: userTimezone }));
    const endInTimezone = new Date(event.end.toLocaleString('en-US', { timeZone: userTimezone }));

    const startHour = startInTimezone.getHours() + startInTimezone.getMinutes() / 60;
    const endHour = endInTimezone.getHours() + endInTimezone.getMinutes() / 60;
    const top = (startHour - 8) * 60; // 60px per hour, starting at 8 AM
    const height = (endHour - startHour) * 60;
    return { top: Math.max(top, 0), height: Math.max(height, 30) };
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <MainCanvas
        title="Calendar"
        subtitle={currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      >
        <Card padding="none" className="overflow-hidden">
          <div className="animate-pulse">
            <div className="h-16 bg-[var(--bg-tertiary)] border-b border-[var(--border-light)]" />
            <div className="h-[720px] bg-[var(--bg-tertiary)]" />
          </div>
        </Card>
      </MainCanvas>
    );
  }

  // Error state
  if (error) {
    return (
      <MainCanvas
        title="Calendar"
        subtitle={currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      >
        <Card padding="lg">
          <div className="text-center py-8">
            <p className="text-[var(--text-secondary)] mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-lg"
            >
              Try again
            </button>
          </div>
        </Card>
      </MainCanvas>
    );
  }

  return (
    <MainCanvas
      title="Calendar"
      subtitle={currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      headerAction={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Event
          </Button>
          <div className="w-px bg-[var(--border-light)]" />
          <Button variant="secondary" size="sm" onClick={goToPreviousWeek}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Prev
          </Button>
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={goToNextWeek}>
            Next
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Button>
        </div>
      }
    >
      <Card padding="none" className="overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-[var(--border-light)]">
          <div className="p-3 text-xs text-[var(--text-tertiary)]" />
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-3 text-center border-l border-[var(--border-light)] ${
                isToday(day) ? 'bg-[var(--accent-light)]' : ''
              }`}
            >
              <p className="text-xs text-[var(--text-secondary)] uppercase">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className={`text-lg font-semibold ${
                isToday(day) ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
              }`}>
                {day.getDate()}
              </p>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="grid grid-cols-8 relative" style={{ height: `${hours.length * 60}px` }}>
          {/* Time labels */}
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-3 text-xs text-[var(--text-tertiary)]"
                style={{ top: `${(hour - 8) * 60 - 6}px` }}
              >
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-[var(--border-light)] ${
                  isToday(day) ? 'bg-[var(--accent-light)]' : ''
                }`}
              >
                {/* Hour lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-[var(--border-light)]"
                    style={{ top: `${(hour - 8) * 60}px` }}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((event) => {
                  const colors = categoryColors[event.category];

                  // Handle all-day events differently
                  if (event.isAllDay) {
                    return (
                      <div
                        key={event.id}
                        className={`absolute left-1 right-1 rounded-md p-2 border-l-4 cursor-pointer hover:shadow-md transition-shadow top-0 ${colors.bg} ${colors.border}`}
                        style={{
                          height: '24px',
                          marginBottom: '2px',
                          zIndex: 10
                        }}
                        title={`${event.title} (All day)`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <p className={`text-xs font-medium truncate ${colors.text}`}>
                          {event.title}
                        </p>
                      </div>
                    );
                  }

                  // Regular timed events
                  const { top, height } = getEventPosition(event);
                  return (
                    <div
                      key={event.id}
                      className={`absolute left-1 right-1 rounded-md p-2 border-l-4 cursor-pointer hover:shadow-md transition-shadow ${colors.bg} ${colors.border}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      title={`${event.title}\n${formatTime(event.start, userTimezone)} - ${formatTime(event.end, userTimezone)}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <p className={`text-xs font-medium truncate ${colors.text}`}>
                        {event.title}
                      </p>
                      {height > 40 && (
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {formatTime(event.start, userTimezone)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="mt-4 flex gap-4 justify-center">
        {Object.entries(categoryColors).map(([category, colors]) => (
          <div key={category} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${colors.bg} border-l-2 ${colors.border}`} />
            <span className="text-xs text-[var(--text-secondary)] capitalize">{category}</span>
          </div>
        ))}
      </div>

      {/* Event Details Card */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <Card className="max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded ${categoryColors[selectedEvent.category].bg} border-l-2 ${categoryColors[selectedEvent.category].border}`} />
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Time */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-[var(--text-primary)]">
                    {selectedEvent.start.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      timeZone: userTimezone
                    })}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {selectedEvent.isAllDay
                      ? 'All day'
                      : `${formatTime(selectedEvent.start, userTimezone)} - ${formatTime(selectedEvent.end, userTimezone)}`
                    }
                  </p>
                </div>
              </div>

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-[var(--text-primary)]">{selectedEvent.location}</p>
                </div>
              )}

              {/* Meeting Link */}
              {selectedEvent.meetingLink && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <a
                    href={selectedEvent.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--accent-primary)] hover:underline"
                  >
                    Join Meeting
                  </a>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div className="pt-2 border-t border-[var(--border-light)]">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Description</h4>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Attendees */}
              {selectedEvent.attendees.length > 0 && (
                <div className="pt-2 border-t border-[var(--border-light)]">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                    Attendees ({selectedEvent.attendees.length})
                  </h4>
                  <div className="space-y-1">
                    {selectedEvent.attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-primary)]">
                          {attendee.name || attendee.email}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          attendee.responseStatus === 'accepted' ? 'bg-green-100 text-green-700' :
                          attendee.responseStatus === 'declined' ? 'bg-red-100 text-red-700' :
                          attendee.responseStatus === 'tentative' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {attendee.responseStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agenda indicator */}
              {selectedEvent.hasAgenda && (
                <div className="pt-2 border-t border-[var(--border-light)]">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm text-[var(--text-secondary)]">Has agenda</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">New Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEventForm.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="Meeting with..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  autoFocus
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newEventForm.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={newEventForm.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={newEventForm.endTime}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={newEventForm.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  placeholder="Conference Room A or Zoom link"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  value={newEventForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Add details about this event..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                />
              </div>

              {/* Error message */}
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{createError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </MainCanvas>
  );
}
