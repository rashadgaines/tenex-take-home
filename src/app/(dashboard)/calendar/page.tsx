'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainCanvas } from '@/components/layout';
import { Card, Button, VisuallyHidden } from '@/components/ui';
import { EventPopover } from '@/components/calendar';
import { CalendarEvent, DaySchedule } from '@/types';
import { getClientTimezone, startOfDayInTimezone } from '@/lib/date-utils';
import { detectConflicts, getConflictMessage } from '@/lib/calendar/conflicts';
import { useCalendarUndo } from '@/hooks/useUndo';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

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

function formatWeekRange(weekDays: Date[]): string {
  if (weekDays.length === 0) return '';
  const start = weekDays[0];
  const end = weekDays[weekDays.length - 1];
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

const categoryColors: Record<CalendarEvent['category'], { bg: string; border: string; text: string; textSecondary: string; hoverBg: string }> = {
  meeting: { bg: 'bg-blue-600/80', border: 'border-l-blue-400', text: 'text-white', textSecondary: 'text-blue-100', hoverBg: 'hover:bg-blue-600/90' },
  external: { bg: 'bg-amber-600/80', border: 'border-l-amber-400', text: 'text-white', textSecondary: 'text-amber-100', hoverBg: 'hover:bg-amber-600/90' },
  focus: { bg: 'bg-emerald-600/80', border: 'border-l-emerald-400', text: 'text-white', textSecondary: 'text-emerald-100', hoverBg: 'hover:bg-emerald-600/90' },
  personal: { bg: 'bg-violet-600/80', border: 'border-l-violet-400', text: 'text-white', textSecondary: 'text-violet-100', hoverBg: 'hover:bg-violet-600/90' },
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

// Skeleton Loader Component
function CalendarSkeleton() {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="grid grid-cols-8 border-b border-[var(--border-medium)]">
          <div className="p-3" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 border-l border-[var(--border-medium)]">
              <div className="h-4 w-12 bg-[var(--bg-elevated)] rounded mb-2 mx-auto" />
              <div className="h-8 w-8 bg-[var(--bg-elevated)] rounded mx-auto" />
            </div>
          ))}
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-8" style={{ height: '720px' }}>
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-3"
                style={{ top: `${(hour - 8) * 60 - 6}px` }}
              >
                <div className="h-3 w-12 bg-[var(--bg-elevated)] rounded ml-auto" />
              </div>
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <div key={dayIndex} className="relative border-l border-[var(--border-medium)]">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-[var(--border-light)]"
                  style={{ top: `${(hour - 8) * 60}px` }}
                />
              ))}
              {/* Random event skeletons */}
              {dayIndex % 2 === 0 && (
                <>
                  <div
                    className="absolute left-1 right-1 bg-[var(--bg-elevated)] rounded"
                    style={{ top: '60px', height: '45px' }}
                  />
                  <div
                    className="absolute left-1 right-1 bg-[var(--bg-elevated)] rounded"
                    style={{ top: '180px', height: '60px' }}
                  />
                </>
              )}
              {dayIndex % 3 === 1 && (
                <div
                  className="absolute left-1 right-1 bg-[var(--bg-elevated)] rounded"
                  style={{ top: '120px', height: '90px' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Current Time Indicator
function CurrentTimeIndicator({ timezone }: { timezone: string }) {
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const nowInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const hour = nowInTimezone.getHours();
      const minutes = nowInTimezone.getMinutes();

      // Only show if within visible hours (8 AM - 7 PM)
      if (hour >= 8 && hour < 20) {
        const pos = (hour - 8) * 60 + minutes;
        setPosition(pos);
      } else {
        setPosition(null);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timezone]);

  if (position === null) return null;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${position}px` }}
      aria-hidden="true"
    >
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
        <div className="flex-1 h-0.5 bg-red-500" />
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>(DEFAULT_TIMEZONE);

  // Popover state
  const [popoverEvent, setPopoverEvent] = useState<CalendarEvent | null>(null);
  const [popoverAnchorRect, setPopoverAnchorRect] = useState<DOMRect | null>(null);

  // Conflict detection
  const [conflictMap, setConflictMap] = useState<Map<string, { eventId: string; conflictingEventIds: string[]; conflictingEvents: CalendarEvent[] }>>(new Map());

  // Create event modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventForm, setNewEventForm] = useState<NewEventForm>(initialFormState);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Undo state
  const { undoableActions, addUndoableAction, removeUndoableAction } = useCalendarUndo();

  // Accessibility: Track focused event for keyboard navigation
  const [focusedEventIndex, setFocusedEventIndex] = useState<number>(-1);
  const eventRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Initialize user timezone on mount
  useEffect(() => {
    setUserTimezone(getClientTimezone());
  }, []);

  const weekDays = getWeekDays(currentDate);

  // Fetch calendar data
  const fetchCalendar = useCallback(async () => {
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

      const responseData = await response.json();
      const data = responseData.data ?? responseData;
      const events = data.events || [];

      // Parse dates and organize by day
      const parsedEvents: CalendarEvent[] = events.map((event: CalendarEvent) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));

      // Detect conflicts
      const conflicts = detectConflicts(parsedEvents);
      setConflictMap(conflicts);

      // Group events by day using date string comparison
      const currentWeekDays = getWeekDays(currentDate);
      const scheduleByDay: DaySchedule[] = currentWeekDays.map((day) => {
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
      setError('Unable to load calendar. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, router, userTimezone]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

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
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to create event');
      }

      const responseData = await response.json();
      const createdEvent = responseData.data ?? responseData;

      // Add to undo queue
      addUndoableAction(
        createdEvent.id,
        { eventId: createdEvent.id, googleEventId: createdEvent.id },
        `Created "${newEventForm.title.trim()}"`
      );

      // Show success toast
      toast.success(`Event "${newEventForm.title.trim()}" created`);

      // Success - close modal and refresh calendar
      setShowCreateModal(false);
      setNewEventForm(initialFormState);

      // Refresh the calendar
      await fetchCalendar();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle event click for popover
  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverAnchorRect(rect);
    setPopoverEvent(event);
  };

  // Handle delete event
  const handleDeleteEvent = async (event: CalendarEvent) => {
    setPopoverEvent(null);
    setPopoverAnchorRect(null);

    try {
      const response = await fetch(`/api/calendar/events?eventId=${encodeURIComponent(event.id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        throw new Error(data.error?.message || data.error || 'Failed to delete event');
      }

      toast.success(`Event "${event.title}" deleted`);
      await fetchCalendar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  // Handle undo
  const handleUndo = async (actionId: string) => {
    const action = undoableActions.find(a => a.id === actionId);
    if (!action) return;

    try {
      const response = await fetch(`/api/calendar/events?eventId=${encodeURIComponent(action.data.eventId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to undo');
      }

      removeUndoableAction(actionId);
      toast.info('Event creation undone');
      await fetchCalendar();
    } catch (err) {
      toast.error('Failed to undo action');
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

  // Calculate overlapping events and their positions
  const getEventsWithOverlapInfo = (events: CalendarEvent[]): Array<CalendarEvent & { column: number; totalColumns: number }> => {
    if (events.length === 0) return [];

    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const result: Array<CalendarEvent & { column: number; totalColumns: number }> = [];
    const columns: CalendarEvent[][] = [];

    for (const event of sortedEvents) {
      if (event.isAllDay) {
        result.push({ ...event, column: 0, totalColumns: 1 });
        continue;
      }

      const eventStart = new Date(event.start).getTime();

      // Find a column where this event fits (no overlap)
      let placed = false;
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const column = columns[colIndex];
        const lastEventInColumn = column[column.length - 1];
        const lastEventEnd = new Date(lastEventInColumn.end).getTime();

        if (eventStart >= lastEventEnd) {
          // No overlap, place in this column
          column.push(event);
          result.push({ ...event, column: colIndex, totalColumns: 0 }); // totalColumns updated later
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Create new column
        columns.push([event]);
        result.push({ ...event, column: columns.length - 1, totalColumns: 0 });
      }
    }

    // Update totalColumns for each event based on overlapping events
    for (let i = 0; i < result.length; i++) {
      if (result[i].isAllDay) continue;

      const eventStart = new Date(result[i].start).getTime();
      const eventEnd = new Date(result[i].end).getTime();

      // Find all events that overlap with this one
      let maxColumn = result[i].column;
      for (const other of result) {
        if (other.isAllDay || other.id === result[i].id) continue;

        const otherStart = new Date(other.start).getTime();
        const otherEnd = new Date(other.end).getTime();

        // Check if they overlap
        if (eventStart < otherEnd && eventEnd > otherStart) {
          maxColumn = Math.max(maxColumn, other.column);
        }
      }

      result[i].totalColumns = maxColumn + 1;
    }

    return result;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if current week contains today
  const isCurrentWeek = weekDays.some(day => isToday(day));

  // Get all events flattened for keyboard navigation
  const getAllEvents = useCallback((): CalendarEvent[] => {
    return weekSchedule.flatMap(day => day.events).sort((a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }, [weekSchedule]);

  // Handle keyboard navigation for events
  const handleCalendarKeyDown = useCallback((e: React.KeyboardEvent) => {
    const allEvents = getAllEvents();
    if (allEvents.length === 0) return;

    let newIndex = focusedEventIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        newIndex = focusedEventIndex < allEvents.length - 1 ? focusedEventIndex + 1 : 0;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = focusedEventIndex > 0 ? focusedEventIndex - 1 : allEvents.length - 1;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = allEvents.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedEventIndex >= 0 && focusedEventIndex < allEvents.length) {
          const event = allEvents[focusedEventIndex];
          const el = eventRefs.current.get(event.id);
          if (el) {
            const rect = el.getBoundingClientRect();
            setPopoverAnchorRect(rect);
            setPopoverEvent(event);
          }
        }
        return;
      default:
        return;
    }

    setFocusedEventIndex(newIndex);
    const eventId = allEvents[newIndex]?.id;
    if (eventId) {
      eventRefs.current.get(eventId)?.focus();
    }
  }, [focusedEventIndex, getAllEvents]);

  // Set event ref for keyboard navigation
  const setEventRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      eventRefs.current.set(id, el);
    } else {
      eventRefs.current.delete(id);
    }
  }, []);

  // Error state
  if (error && !isLoading) {
    return (
      <MainCanvas
        title="Calendar"
        subtitle={formatWeekRange(weekDays)}
      >
        <Card padding="lg">
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-[var(--text-secondary)] mb-4">{error}</p>
            <Button variant="primary" onClick={fetchCalendar}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </Button>
          </div>
        </Card>
      </MainCanvas>
    );
  }

  return (
    <MainCanvas
      title="Calendar"
      subtitle={formatWeekRange(weekDays)}
      headerAction={
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Event
          </Button>
          <div className="w-px h-6 bg-[var(--border-light)]" />
          <Button variant="secondary" size="sm" onClick={goToPreviousWeek} aria-label="Previous week">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Button>
          <Button
            variant={isCurrentWeek ? 'primary' : 'secondary'}
            size="sm"
            onClick={goToToday}
            className={isCurrentWeek ? 'opacity-60 cursor-default' : ''}
            disabled={isCurrentWeek}
          >
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={goToNextWeek} aria-label="Next week">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Button>
        </div>
      }
    >
      {/* Undo Toast */}
      {undoableActions.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          {undoableActions.slice(0, 1).map((action) => (
            <div
              key={action.id}
              className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-lg shadow-lg animate-in slide-in-from-bottom-2"
              role="alert"
            >
              <span className="text-sm text-[var(--text-secondary)]">{action.description}</span>
              <Button variant="ghost" size="sm" onClick={() => handleUndo(action.id)}>
                Undo
              </Button>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <Card padding="none" className="overflow-hidden" aria-label="Weekly calendar view">
          {/* Header */}
          <div className="grid grid-cols-8 border-b border-[var(--border-medium)]" role="row">
            <div className="p-3 text-xs text-[var(--text-tertiary)]" role="columnheader">
              <VisuallyHidden>Time</VisuallyHidden>
            </div>
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              return (
                <div
                  key={day.toISOString()}
                  role="columnheader"
                  aria-current={isToday(day) ? 'date' : undefined}
                  className={`p-3 text-center border-l border-[var(--border-medium)] ${
                    isToday(day) ? 'bg-blue-900/30' : ''
                  }`}
                >
                  <p className={`text-xs uppercase font-medium ${
                    isToday(day) ? 'text-blue-400' : 'text-[var(--text-secondary)]'
                  }`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className={`text-xl font-bold ${
                    isToday(day) ? 'text-blue-400' : 'text-[var(--text-primary)]'
                  }`}>
                    {day.getDate()}
                  </p>
                  {!hasEvents && (
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1">No events</p>
                  )}
                  <VisuallyHidden>
                    {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {isToday(day) && ' (Today)'}
                  </VisuallyHidden>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div
            className="grid grid-cols-8 relative"
            style={{ height: `${hours.length * 60}px` }}
            role="grid"
            aria-label={`Calendar events for week of ${weekDays[0]?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
            onKeyDown={handleCalendarKeyDown}
          >
            {/* Time labels */}
            <div className="relative" role="rowheader">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full text-right pr-3 text-xs text-[var(--text-tertiary)]"
                  style={{ top: `${(hour - 8) * 60 - 6}px` }}
                  aria-hidden="true"
                >
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const eventsWithOverlap = getEventsWithOverlapInfo(dayEvents);
              const dayLabel = day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
              const isTodayColumn = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  role="gridcell"
                  aria-label={`${dayLabel}, ${eventsWithOverlap.length} events`}
                  className={`relative border-l border-[var(--border-medium)] ${
                    isTodayColumn ? 'bg-blue-900/10' : ''
                  }`}
                >
                  {/* Hour lines with subtle half-hour grid */}
                  {hours.map((hour) => (
                    <div key={hour}>
                      <div
                        className="absolute w-full border-t border-[var(--border-light)]"
                        style={{ top: `${(hour - 8) * 60}px` }}
                        aria-hidden="true"
                      />
                      {/* Half-hour line (more subtle) */}
                      <div
                        className="absolute w-full border-t border-[var(--border-light)] opacity-30"
                        style={{ top: `${(hour - 8) * 60 + 30}px` }}
                        aria-hidden="true"
                      />
                    </div>
                  ))}

                  {/* Current time indicator */}
                  {isTodayColumn && <CurrentTimeIndicator timezone={userTimezone} />}

                  {/* Events */}
                  {eventsWithOverlap.map((event) => {
                    const colors = categoryColors[event.category];
                    const hasConflict = conflictMap.has(event.id);
                    const conflictDetails = conflictMap.get(event.id);
                    const conflictMessage = conflictDetails
                      ? getConflictMessage(event, conflictDetails.conflictingEvents)
                      : '';
                    const eventTimeLabel = event.isAllDay
                      ? 'All day'
                      : `${formatTime(event.start, userTimezone)} to ${formatTime(event.end, userTimezone)}`;
                    const eventLabel = `${event.title}, ${event.category} event, ${eventTimeLabel}${hasConflict ? `, ${conflictMessage}` : ''}`;

                    // Handle all-day events differently
                    if (event.isAllDay) {
                      return (
                        <button
                          key={event.id}
                          ref={(el) => setEventRef(event.id, el)}
                          type="button"
                          className={`absolute left-1 right-1 rounded p-1.5 border-l-4 cursor-pointer transition-all top-0 shadow-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${colors.bg} ${colors.border} ${colors.hoverBg}`}
                          style={{
                            height: '26px',
                            marginBottom: '2px',
                            zIndex: 10
                          }}
                          aria-label={eventLabel}
                          onClick={(e) => handleEventClick(event, e)}
                          onFocus={() => {
                            const allEvents = getAllEvents();
                            const idx = allEvents.findIndex(ev => ev.id === event.id);
                            setFocusedEventIndex(idx);
                          }}
                        >
                          <p className={`text-xs font-semibold truncate ${colors.text}`} aria-hidden="true">
                            {event.title}
                          </p>
                        </button>
                      );
                    }

                    // Regular timed events with overlap handling
                    const { top, height } = getEventPosition(event);
                    const width = event.totalColumns > 1 ? `calc(${100 / event.totalColumns}% - 4px)` : 'calc(100% - 8px)';
                    const left = event.totalColumns > 1 ? `calc(${(event.column / event.totalColumns) * 100}% + 2px)` : '4px';

                    return (
                      <button
                        key={event.id}
                        ref={(el) => setEventRef(event.id, el)}
                        type="button"
                        className={`absolute rounded p-1.5 border-l-4 cursor-pointer transition-all shadow-sm overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${colors.bg} ${colors.border} ${colors.hoverBg} ${
                          hasConflict ? 'ring-2 ring-amber-400/60' : ''
                        }`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          minHeight: '24px',
                          width,
                          left,
                          zIndex: event.column + 1
                        }}
                        aria-label={eventLabel}
                        onClick={(e) => handleEventClick(event, e)}
                        onFocus={() => {
                          const allEvents = getAllEvents();
                          const idx = allEvents.findIndex(ev => ev.id === event.id);
                          setFocusedEventIndex(idx);
                        }}
                      >
                        <div className="flex items-start gap-1">
                          <p className={`text-xs font-semibold truncate leading-tight flex-1 ${colors.text}`} aria-hidden="true">
                            {event.title}
                          </p>
                          {hasConflict && (
                            <svg
                              className="w-3 h-3 text-amber-300 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        {height > 36 && (
                          <p className={`text-[10px] truncate mt-0.5 ${colors.textSecondary}`} aria-hidden="true">
                            {formatTime(event.start, userTimezone)}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="mt-4 flex gap-6 justify-center flex-wrap">
        {Object.entries(categoryColors).map(([category, colors]) => (
          <div key={category} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded border-l-4 ${colors.bg} ${colors.border}`} aria-hidden="true" />
            <span className="text-sm text-[var(--text-secondary)] capitalize">{category}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded ring-2 ring-amber-400/60 bg-[var(--bg-tertiary)]" aria-hidden="true" />
          <span className="text-sm text-[var(--text-secondary)]">Conflict</span>
        </div>
      </div>

      {/* Event Popover */}
      {popoverEvent && popoverAnchorRect && (
        <EventPopover
          event={popoverEvent}
          anchorRect={popoverAnchorRect}
          timezone={userTimezone}
          onClose={() => {
            setPopoverEvent(null);
            setPopoverAnchorRect(null);
          }}
          onDelete={handleDeleteEvent}
          hasConflict={conflictMap.has(popoverEvent.id)}
          conflictMessage={
            conflictMap.has(popoverEvent.id)
              ? getConflictMessage(popoverEvent, conflictMap.get(popoverEvent.id)!.conflictingEvents)
              : ''
          }
        />
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-title"
        >
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 id="create-event-title" className="text-lg font-semibold text-[var(--text-primary)]">New Event</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-medium)] rounded"
                aria-label="Close create event dialog"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4" aria-describedby={createError ? 'create-event-error' : undefined}>
              {/* Title */}
              <div>
                <label htmlFor="event-title" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Title <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="event-title"
                  type="text"
                  value={newEventForm.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="Meeting with..."
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-medium)]"
                  autoFocus
                  required
                  aria-required="true"
                />
              </div>

              {/* Date */}
              <div>
                <label htmlFor="event-date" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Date <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="event-date"
                  type="date"
                  value={newEventForm.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-medium)]"
                  required
                  aria-required="true"
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="event-start-time" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Start Time <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="event-start-time"
                    type="time"
                    value={newEventForm.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-medium)]"
                    required
                    aria-required="true"
                  />
                </div>
                <div>
                  <label htmlFor="event-end-time" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    End Time <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="event-end-time"
                    type="time"
                    value={newEventForm.endTime}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-medium)]"
                    required
                    aria-required="true"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="event-location" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Location
                </label>
                <input
                  id="event-location"
                  type="text"
                  value={newEventForm.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  placeholder="Conference Room A or Zoom link"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-medium)]"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="event-description" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  id="event-description"
                  value={newEventForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Add details about this event..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-medium)] resize-none"
                />
              </div>

              {/* Error message */}
              {createError && (
                <div id="create-event-error" className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg" role="alert">
                  <p className="text-sm text-red-400">{createError}</p>
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
