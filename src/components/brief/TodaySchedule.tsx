'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';
import { CalendarEvent } from '@/types';

interface TodayScheduleProps {
  events: CalendarEvent[];
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

const categoryStyles: Record<CalendarEvent['category'], { bar: string; bg: string }> = {
  meeting: { bar: 'bg-[var(--meeting-internal-border)]', bg: 'bg-[var(--meeting-internal)]' },
  external: { bar: 'bg-[var(--meeting-external-border)]', bg: 'bg-[var(--meeting-external)]' },
  focus: { bar: 'bg-[var(--meeting-focus-border)]', bg: 'bg-[var(--meeting-focus)]' },
  personal: { bar: 'bg-[var(--meeting-personal-border)]', bg: 'bg-[var(--meeting-personal)]' },
};

export function TodaySchedule({ events }: TodayScheduleProps) {
  const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Today&apos;s Schedule
        </h3>
        <Link
          href="/calendar"
          className="text-sm text-[var(--accent-primary)] hover:underline"
        >
          View full calendar
        </Link>
      </div>

      {sortedEvents.length === 0 ? (
        <p className="text-[var(--text-secondary)] text-sm py-4 text-center">
          No events scheduled for today
        </p>
      ) : (
        <div className="space-y-2">
          {sortedEvents.map((event) => {
            const styles = categoryStyles[event.category];
            return (
              <div
                key={event.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${styles.bg}`}
              >
                <div className={`w-1 h-10 rounded-full ${styles.bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      {event.title}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] flex-shrink-0">
                      {getDuration(event.start, event.end)}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {formatTime(event.start)}
                    {event.attendees.length > 0 && (
                      <span className="ml-2">
                        · {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
