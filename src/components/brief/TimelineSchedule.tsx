'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui';
import { CalendarEvent } from '@/types';

interface TimelineScheduleProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getDuration(start: Date, end: Date): string {
  const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getEventStatus(event: CalendarEvent): 'past' | 'current' | 'upcoming' {
  const now = new Date();
  if (event.end < now) return 'past';
  if (event.start <= now && event.end >= now) return 'current';
  return 'upcoming';
}

function getNextEventInfo(events: CalendarEvent[]): string | null {
  const now = new Date();
  const sortedUpcoming = events
    .filter(e => e.start > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (sortedUpcoming.length === 0) {
    const currentEvent = events.find(e => e.start <= now && e.end >= now);
    if (currentEvent) {
      return `In "${currentEvent.title}" now`;
    }
    return "You're free for the rest of the day";
  }

  const next = sortedUpcoming[0];
  const diffMs = next.start.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));

  if (diffMins < 60) {
    return `Free for ${diffMins} minutes, then "${next.title}"`;
  }

  const diffHours = Math.round(diffMins / 60 * 10) / 10;
  return `Free for ${diffHours}h, then "${next.title}"`;
}

const categoryStyles: Record<CalendarEvent['category'], { bar: string; bg: string; activeBg: string }> = {
  meeting: {
    bar: 'bg-[var(--meeting-internal-border)]',
    bg: 'bg-[var(--meeting-internal)]',
    activeBg: 'bg-blue-500/30',
  },
  external: {
    bar: 'bg-[var(--meeting-external-border)]',
    bg: 'bg-[var(--meeting-external)]',
    activeBg: 'bg-amber-500/30',
  },
  focus: {
    bar: 'bg-[var(--meeting-focus-border)]',
    bg: 'bg-[var(--meeting-focus)]',
    activeBg: 'bg-emerald-500/30',
  },
  personal: {
    bar: 'bg-[var(--meeting-personal-border)]',
    bg: 'bg-[var(--meeting-personal)]',
    activeBg: 'bg-purple-500/30',
  },
};

interface TimelineEventProps {
  event: CalendarEvent;
  index: number;
  isLast: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

function TimelineEvent({ event, index, isLast, onEventClick }: TimelineEventProps) {
  const status = getEventStatus(event);
  const styles = categoryStyles[event.category];
  const isPast = status === 'past';
  const isCurrent = status === 'current';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="relative flex gap-4"
    >
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        {/* Time dot */}
        <div
          className={`
            w-3 h-3 rounded-full border-2 flex-shrink-0 relative z-10
            ${isCurrent
              ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
              : isPast
                ? 'bg-[var(--bg-tertiary)] border-[var(--border-medium)]'
                : 'bg-[var(--bg-secondary)] border-[var(--border-medium)]'
            }
          `}
        >
          {isCurrent && (
            <motion.div
              className="absolute inset-0 rounded-full bg-[var(--accent-primary)]"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[60px] ${isPast ? 'bg-[var(--border-light)]' : 'bg-[var(--border-medium)]'}`} />
        )}
      </div>

      {/* Event card */}
      <motion.div
        onClick={() => onEventClick?.(event)}
        className={`
          flex-1 mb-4 p-4 rounded-xl cursor-pointer transition-all duration-200
          ${isCurrent ? styles.activeBg : styles.bg}
          ${isPast ? 'opacity-60' : ''}
          hover:scale-[1.01] hover:shadow-md
        `}
        whileHover={{ x: 4 }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onEventClick?.(event)}
        aria-label={`${event.title} at ${formatTime(event.start)}`}
      >
        <div className="flex items-start gap-3">
          {/* Category indicator */}
          <div className={`w-1 h-full min-h-[40px] rounded-full flex-shrink-0 ${styles.bar}`} />

          <div className="flex-1 min-w-0">
            {/* Time and status */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {formatTime(event.start)}
              </span>
              {isCurrent && (
                <span className="px-2 py-0.5 text-xs font-medium bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-full">
                  Now
                </span>
              )}
              <span className="text-xs text-[var(--text-tertiary)]">
                {getDuration(event.start, event.end)}
              </span>
            </div>

            {/* Title */}
            <h4 className={`font-medium truncate ${isPast ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
              {event.title}
            </h4>

            {/* Attendees */}
            {event.attendees.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Location or meeting link */}
            {(event.location || event.meetingLink) && (
              <div className="flex items-center gap-1 mt-1">
                <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="text-xs text-[var(--text-tertiary)] truncate">
                  {event.location || 'Virtual meeting'}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function TimelineSchedule({ events, onEventClick }: TimelineScheduleProps) {
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);
  const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const statusMessage = getNextEventInfo(sortedEvents);

  useEffect(() => {
    const updateTimePosition = () => {
      if (sortedEvents.length === 0) return;

      const now = new Date();
      const firstEvent = sortedEvents[0];
      const lastEvent = sortedEvents[sortedEvents.length - 1];

      const totalRange = lastEvent.end.getTime() - firstEvent.start.getTime();
      const currentOffset = now.getTime() - firstEvent.start.getTime();
      const position = Math.max(0, Math.min(100, (currentOffset / totalRange) * 100));

      setCurrentTimePosition(position);
    };

    updateTimePosition();
    const interval = setInterval(updateTimePosition, 60000);
    return () => clearInterval(interval);
  }, [sortedEvents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="mb-8"
    >
      <Card padding="lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-lg">
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Today&apos;s Schedule
            </h3>
            {statusMessage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-[var(--text-secondary)] mt-1"
              >
                {statusMessage}
              </motion.p>
            )}
          </div>
          <Link
            href="/calendar"
            className="flex items-center gap-1 text-sm text-[var(--accent-primary)] hover:underline transition-colors"
          >
            View calendar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Timeline */}
        <AnimatePresence>
          {sortedEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--meeting-focus)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--meeting-focus-border)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[var(--text-secondary)] font-medium">No events scheduled</p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">Enjoy your free day!</p>
            </motion.div>
          ) : (
            <div className="relative">
              {sortedEvents.map((event, index) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  index={index}
                  isLast={index === sortedEvents.length - 1}
                  onEventClick={onEventClick}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
