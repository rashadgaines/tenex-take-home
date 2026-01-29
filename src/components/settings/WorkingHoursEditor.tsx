'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

interface WorkingHours {
  start: string;
  end: string;
}

interface WorkingHoursEditorProps {
  workingHours: WorkingHours;
  timezone: string;
  onChange: (hours: WorkingHours) => void;
  onSave: () => void;
  isSaving?: boolean;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function WorkingHoursEditor({
  workingHours,
  timezone,
  onChange,
  onSave,
  isSaving
}: WorkingHoursEditorProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

  // Calculate percentage positions for the timeline
  const startPercent = (timeToMinutes(workingHours.start) / (24 * 60)) * 100;
  const endPercent = (timeToMinutes(workingHours.end) / (24 * 60)) * 100;

  const handleMouseDown = (handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(handle);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const minutes = Math.round((percent / 100) * 24 * 60 / 15) * 15; // Round to 15-minute increments
    const time = minutesToTime(Math.min(minutes, 24 * 60 - 15));

    if (isDragging === 'start') {
      const endMinutes = timeToMinutes(workingHours.end);
      if (minutes < endMinutes - 30) { // Minimum 30-minute gap
        onChange({ ...workingHours, start: time });
      }
    } else {
      const startMinutes = timeToMinutes(workingHours.start);
      if (minutes > startMinutes + 30) { // Minimum 30-minute gap
        onChange({ ...workingHours, end: time });
      }
    }
  }, [isDragging, workingHours, onChange]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(null);
      onSave();
    }
  }, [isDragging, onSave]);

  const handleKeyDown = (handle: 'start' | 'end') => (e: React.KeyboardEvent) => {
    const increment = 15; // 15-minute increments
    let delta = 0;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = -increment;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        delta = increment;
        break;
      case 'Home':
        // Jump to minimum value
        if (handle === 'start') {
          onChange({ ...workingHours, start: minutesToTime(0) });
          onSave();
        }
        return;
      case 'End':
        // Jump to maximum value
        if (handle === 'end') {
          onChange({ ...workingHours, end: minutesToTime(24 * 60 - 15) });
          onSave();
        }
        return;
      default:
        return;
    }

    e.preventDefault();

    if (handle === 'start') {
      const currentMinutes = timeToMinutes(workingHours.start);
      const newMinutes = Math.max(0, Math.min(currentMinutes + delta, timeToMinutes(workingHours.end) - 30));
      onChange({ ...workingHours, start: minutesToTime(newMinutes) });
    } else {
      const currentMinutes = timeToMinutes(workingHours.end);
      const newMinutes = Math.max(timeToMinutes(workingHours.start) + 30, Math.min(currentMinutes + delta, 24 * 60 - 15));
      onChange({ ...workingHours, end: minutesToTime(newMinutes) });
    }
    onSave();
  };

  // Attach global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate work duration
  const workDuration = timeToMinutes(workingHours.end) - timeToMinutes(workingHours.start);
  const workHours = Math.floor(workDuration / 60);
  const workMins = workDuration % 60;
  const durationText = workMins > 0 ? `${workHours}h ${workMins}m` : `${workHours} hours`;

  // Get current time in user's timezone for preview
  const getCurrentTimePreview = () => {
    try {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
        hour12: true
      };
      return new Intl.DateTimeFormat('en-US', options).format(now);
    } catch {
      return '';
    }
  };

  return (
    <Card padding="lg">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Working Hours
          </span>
        }
        subtitle="Set your typical work schedule"
      />

      {/* Visual Timeline */}
      <div className="mb-6">
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-2">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>12 AM</span>
        </div>

        <div
          ref={sliderRef}
          className="relative h-12 bg-[var(--bg-secondary)] rounded-lg cursor-pointer select-none"
        >
          {/* Hour markers */}
          {Array.from({ length: 25 }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-[var(--border-light)]"
              style={{ left: `${(i / 24) * 100}%` }}
            />
          ))}

          {/* Working hours range */}
          <div
            className="absolute top-1 bottom-1 bg-[var(--accent-primary)] opacity-30 rounded transition-all duration-75"
            style={{
              left: `${startPercent}%`,
              width: `${endPercent - startPercent}%`
            }}
          />

          {/* Start handle */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Adjust work start time"
            aria-valuemin={0}
            aria-valuemax={timeToMinutes(workingHours.end) - 30}
            aria-valuenow={timeToMinutes(workingHours.start)}
            aria-valuetext={formatTime12h(workingHours.start)}
            onMouseDown={handleMouseDown('start')}
            onKeyDown={handleKeyDown('start')}
            className={`
              absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize
              flex items-center justify-center group
              ${isDragging === 'start' ? 'z-20' : 'z-10'}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2
            `}
            style={{ left: `${startPercent}%` }}
          >
            <div className={`
              w-3 h-8 bg-[var(--accent-primary)] rounded-full shadow-lg
              transition-transform duration-150
              ${isDragging === 'start' ? 'scale-110' : 'group-hover:scale-105'}
            `} />
            {/* Time label on hover/drag */}
            <div className={`
              absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1
              bg-[var(--bg-elevated)] border border-[var(--border-medium)]
              rounded text-xs text-[var(--text-primary)] whitespace-nowrap
              shadow-lg transition-opacity duration-150
              ${isDragging === 'start' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}>
              {formatTime12h(workingHours.start)}
            </div>
          </div>

          {/* End handle */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Adjust work end time"
            aria-valuemin={timeToMinutes(workingHours.start) + 30}
            aria-valuemax={24 * 60 - 15}
            aria-valuenow={timeToMinutes(workingHours.end)}
            aria-valuetext={formatTime12h(workingHours.end)}
            onMouseDown={handleMouseDown('end')}
            onKeyDown={handleKeyDown('end')}
            className={`
              absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize
              flex items-center justify-center group
              ${isDragging === 'end' ? 'z-20' : 'z-10'}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2
            `}
            style={{ left: `${endPercent}%` }}
          >
            <div className={`
              w-3 h-8 bg-[var(--accent-primary)] rounded-full shadow-lg
              transition-transform duration-150
              ${isDragging === 'end' ? 'scale-110' : 'group-hover:scale-105'}
            `} />
            {/* Time label on hover/drag */}
            <div className={`
              absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1
              bg-[var(--bg-elevated)] border border-[var(--border-medium)]
              rounded text-xs text-[var(--text-primary)] whitespace-nowrap
              shadow-lg transition-opacity duration-150
              ${isDragging === 'end' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}>
              {formatTime12h(workingHours.end)}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2">
          <div className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">{formatTime12h(workingHours.start)}</span>
            {' to '}
            <span className="font-medium text-[var(--text-primary)]">{formatTime12h(workingHours.end)}</span>
          </div>
          <div className="text-sm text-[var(--text-tertiary)]">
            {durationText}
          </div>
        </div>
      </div>

      {/* Time Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Time"
          type="time"
          value={workingHours.start}
          onChange={(e) => onChange({ ...workingHours, start: e.target.value })}
          onBlur={onSave}
          disabled={isSaving}
        />
        <Input
          label="End Time"
          type="time"
          value={workingHours.end}
          onChange={(e) => onChange({ ...workingHours, end: e.target.value })}
          onBlur={onSave}
          disabled={isSaving}
        />
      </div>

      {/* Timezone preview */}
      <div className="mt-4 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-light)]">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[var(--text-secondary)]">
            Current time in your timezone ({timezone.split('/').pop()}):
          </span>
          <span className="font-medium text-[var(--text-primary)]">
            {getCurrentTimePreview()}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm text-[var(--text-secondary)]">
        Meetings will be scheduled within these hours unless specified otherwise.
        Drag the handles above or edit the times directly.
      </p>
    </Card>
  );
}
