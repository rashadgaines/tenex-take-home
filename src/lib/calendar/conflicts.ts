import type { CalendarEvent } from '@/types/calendar';

export interface EventConflict {
  eventId: string;
  conflictingEventIds: string[];
  conflictingEvents: CalendarEvent[];
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Find all conflicts for a single event
 */
export function findConflictsForEvent(
  event: CalendarEvent,
  allEvents: CalendarEvent[]
): CalendarEvent[] {
  // All-day events don't conflict with timed events in this model
  if (event.isAllDay) {
    return [];
  }

  const conflicts: CalendarEvent[] = [];

  for (const otherEvent of allEvents) {
    // Skip self-comparison and all-day events
    if (otherEvent.id === event.id || otherEvent.isAllDay) {
      continue;
    }

    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const otherStart = new Date(otherEvent.start);
    const otherEnd = new Date(otherEvent.end);

    if (timeRangesOverlap(eventStart, eventEnd, otherStart, otherEnd)) {
      conflicts.push(otherEvent);
    }
  }

  return conflicts;
}

/**
 * Detect all overlapping events in a list
 * Returns a map of eventId -> array of conflicting events
 */
export function detectConflicts(
  events: CalendarEvent[]
): Map<string, EventConflict> {
  const conflictMap = new Map<string, EventConflict>();

  // Filter to only timed events (all-day events don't conflict)
  const timedEvents = events.filter((e) => !e.isAllDay);

  // Sort by start time for efficient comparison
  const sortedEvents = [...timedEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const eventEnd = new Date(event.end).getTime();

    for (let j = i + 1; j < sortedEvents.length; j++) {
      const otherEvent = sortedEvents[j];
      const otherStart = new Date(otherEvent.start).getTime();

      // Since events are sorted by start time, if otherStart >= eventEnd,
      // no further events can overlap with the current event
      if (otherStart >= eventEnd) {
        break;
      }

      // There's a conflict
      // Add to both events' conflict lists
      if (!conflictMap.has(event.id)) {
        conflictMap.set(event.id, {
          eventId: event.id,
          conflictingEventIds: [],
          conflictingEvents: [],
        });
      }
      if (!conflictMap.has(otherEvent.id)) {
        conflictMap.set(otherEvent.id, {
          eventId: otherEvent.id,
          conflictingEventIds: [],
          conflictingEvents: [],
        });
      }

      const eventConflict = conflictMap.get(event.id)!;
      const otherConflict = conflictMap.get(otherEvent.id)!;

      if (!eventConflict.conflictingEventIds.includes(otherEvent.id)) {
        eventConflict.conflictingEventIds.push(otherEvent.id);
        eventConflict.conflictingEvents.push(otherEvent);
      }

      if (!otherConflict.conflictingEventIds.includes(event.id)) {
        otherConflict.conflictingEventIds.push(event.id);
        otherConflict.conflictingEvents.push(event);
      }
    }
  }

  return conflictMap;
}

/**
 * Check if a specific event has conflicts
 */
export function hasConflict(
  eventId: string,
  conflictMap: Map<string, EventConflict>
): boolean {
  return conflictMap.has(eventId);
}

/**
 * Get conflict details for a specific event
 */
export function getConflictDetails(
  eventId: string,
  conflictMap: Map<string, EventConflict>
): EventConflict | undefined {
  return conflictMap.get(eventId);
}

/**
 * Generate a human-readable conflict message
 */
export function getConflictMessage(
  event: CalendarEvent,
  conflictingEvents: CalendarEvent[]
): string {
  if (conflictingEvents.length === 0) {
    return '';
  }

  if (conflictingEvents.length === 1) {
    return `Conflicts with "${conflictingEvents[0].title}"`;
  }

  return `Conflicts with ${conflictingEvents.length} events: ${conflictingEvents
    .slice(0, 2)
    .map((e) => `"${e.title}"`)
    .join(', ')}${conflictingEvents.length > 2 ? '...' : ''}`;
}
