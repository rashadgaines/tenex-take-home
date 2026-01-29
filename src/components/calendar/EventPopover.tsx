'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Button } from '@/components/ui';

interface EventPopoverProps {
  event: CalendarEvent;
  anchorRect: DOMRect;
  timezone: string;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  hasConflict?: boolean;
  conflictMessage?: string;
}

const categoryColors: Record<CalendarEvent['category'], { bg: string; border: string }> = {
  meeting: { bg: 'bg-blue-600', border: 'border-blue-400' },
  external: { bg: 'bg-amber-600', border: 'border-amber-400' },
  focus: { bg: 'bg-emerald-600', border: 'border-emerald-400' },
  personal: { bg: 'bg-violet-600', border: 'border-violet-400' },
};

function formatTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
}

export function EventPopover({
  event,
  anchorRect,
  timezone,
  onClose,
  onEdit,
  onDelete,
  hasConflict,
  conflictMessage,
}: EventPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Calculate position to avoid viewport overflow
  const calculatePosition = useCallback(() => {
    if (!popoverRef.current) return;

    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 16;

    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;

    // Check if popover would overflow bottom
    if (top + popoverRect.height > viewportHeight - padding) {
      // Position above the anchor
      top = anchorRect.top - popoverRect.height - 8;
    }

    // Check if popover would overflow right
    if (left + popoverRect.width > viewportWidth - padding) {
      left = viewportWidth - popoverRect.width - padding;
    }

    // Check if popover would overflow left
    if (left < padding) {
      left = padding;
    }

    // Ensure top is not negative
    if (top < padding) {
      top = padding;
    }

    setPosition({ top, left });
    setIsVisible(true);
  }, [anchorRect]);

  useEffect(() => {
    // Small delay to allow DOM measurement
    const timer = setTimeout(calculatePosition, 10);
    return () => clearTimeout(timer);
  }, [calculatePosition]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyLink = async () => {
    if (event.meetingLink) {
      try {
        await navigator.clipboard.writeText(event.meetingLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        // Copy failed silently
      }
    }
  };

  const colors = categoryColors[event.category];

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-popover-title"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 100,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
      }}
      className="w-80 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl shadow-xl overflow-hidden"
    >
      {/* Header with category indicator */}
      <div className={`h-1.5 ${colors.bg}`} />

      <div className="p-4">
        {/* Title and conflict warning */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-3 h-3 rounded-sm mt-1 ${colors.bg}`} />
          <div className="flex-1 min-w-0">
            <h3
              id="event-popover-title"
              className="text-base font-semibold text-[var(--text-primary)] truncate"
            >
              {event.title}
            </h3>
            {hasConflict && (
              <div className="flex items-center gap-1.5 mt-1">
                <svg
                  className="w-4 h-4 text-amber-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-xs text-amber-500">{conflictMessage || 'Schedule conflict'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-[var(--text-secondary)]">
            {event.isAllDay
              ? 'All day'
              : `${formatTime(event.start, timezone)} - ${formatTime(event.end, timezone)}`}
          </span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm text-[var(--text-secondary)] truncate">
              {event.location}
            </span>
          </div>
        )}

        {/* Meeting Link */}
        {event.meetingLink && (
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent-primary)] hover:underline truncate"
            >
              Join Meeting
            </a>
          </div>
        )}

        {/* Attendees */}
        {event.attendees.length > 0 && (
          <div className="flex items-start gap-2 mb-3">
            <svg
              className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-[var(--text-secondary)]">
                {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {event.attendees.slice(0, 3).map((attendee, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      attendee.responseStatus === 'accepted'
                        ? 'bg-green-500/20 text-green-400'
                        : attendee.responseStatus === 'declined'
                        ? 'bg-red-500/20 text-red-400'
                        : attendee.responseStatus === 'tentative'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {attendee.name || attendee.email.split('@')[0]}
                  </span>
                ))}
                {event.attendees.length > 3 && (
                  <span className="text-xs text-[var(--text-tertiary)]">
                    +{event.attendees.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-light)]">
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(event)}
              className="flex-1"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDelete(event)}
              className="flex-1 text-red-400 hover:text-red-300"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </Button>
          )}
          {event.meetingLink && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              aria-label={copySuccess ? "Meeting link copied" : "Copy meeting link"}
            >
              {copySuccess ? (
                <svg
                  className="w-4 h-4 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
