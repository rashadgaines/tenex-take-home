'use client';

import { useState } from 'react';
import { MainCanvas } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { mockEvents, getWeekEvents } from '@/lib/mocks';
import { CalendarEvent } from '@/types';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getWeekDays(baseDate: Date): Date[] {
  const days: Date[] = [];
  const startOfWeek = new Date(baseDate);
  startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());

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

export default function CalendarPage() {
  const [currentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const weekDays = getWeekDays(currentDate);
  const events = getWeekEvents();

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventDate = event.start;
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  const getEventPosition = (event: CalendarEvent): { top: number; height: number } => {
    const startHour = event.start.getHours() + event.start.getMinutes() / 60;
    const endHour = event.end.getHours() + event.end.getMinutes() / 60;
    const top = (startHour - 8) * 60; // 60px per hour, starting at 8 AM
    const height = (endHour - startHour) * 60;
    return { top, height: Math.max(height, 30) };
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <MainCanvas
      title="Calendar"
      subtitle={currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      headerAction={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Prev
          </Button>
          <Button variant="secondary" size="sm">
            Today
          </Button>
          <Button variant="secondary" size="sm">
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
                  const { top, height } = getEventPosition(event);
                  const colors = categoryColors[event.category];
                  return (
                    <div
                      key={event.id}
                      className={`absolute left-1 right-1 rounded-md p-2 border-l-4 cursor-pointer hover:shadow-md transition-shadow ${colors.bg} ${colors.border}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      title={event.title}
                    >
                      <p className={`text-xs font-medium truncate ${colors.text}`}>
                        {event.title}
                      </p>
                      {height > 40 && (
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {formatTime(event.start)}
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
    </MainCanvas>
  );
}
