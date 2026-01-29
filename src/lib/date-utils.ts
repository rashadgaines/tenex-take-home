import { format, parseISO, startOfDay, endOfDay, isSameDay, zonedTimeToUtc, utcToZonedTime } from 'date-fns';
import { formatInTimeZone, zonedTimeToUtc as tzZonedTimeToUtc, utcToZonedTime as tzUtcToZonedTime } from 'date-fns-tz';
import { getUserTimezone } from './user-preferences';

/**
 * Date and timezone utility functions for the scheduling system
 * All functions are timezone-aware and handle conversions properly
 */

/**
 * Default timezone if user preference is not available
 */
export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

/**
 * Get user's timezone preference (server-side function that requires userId)
 */
export async function getUserTimezoneFromDb(userId: string): Promise<string> {
  return await getUserTimezone(userId);
}

/**
 * Get user's timezone preference from localStorage (client-side only)
 * Use this for client-side operations where userId might not be available
 */
export function getUserTimezone(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('user-timezone');
    if (stored) return stored;
  }
  return DEFAULT_TIMEZONE;
}

/**
 * Set user's timezone preference (client-side only)
 */
export function setUserTimezone(timezone: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user-timezone', timezone);
  }
}

/**
 * Convert a date/time string to a Date object in the specified timezone
 * Handles both ISO strings and date-time strings
 */
export function parseDateInTimezone(dateStr: string, timezone: string = getUserTimezone()): Date {
  try {
    // If it's already an ISO string with timezone info, parse it directly
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
      return parseISO(dateStr);
    }

    // Otherwise, assume it's in the user's timezone
    return tzZonedTimeToUtc(dateStr, timezone);
  } catch (error) {
    console.warn('Failed to parse date:', dateStr, error);
    return new Date(dateStr); // fallback
  }
}

/**
 * Format a date for display in the user's timezone
 */
export function formatDateInTimezone(
  date: Date | string,
  formatStr: string = 'yyyy-MM-dd HH:mm',
  timezone: string = getUserTimezone()
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, timezone, formatStr);
}

/**
 * Check if two dates represent the same day in the specified timezone
 */
export function isSameDayInTimezone(
  date1: Date | string,
  date2: Date | string,
  timezone: string = getUserTimezone()
): boolean {
  const d1 = typeof date1 === 'string' ? parseDateInTimezone(date1, timezone) : date1;
  const d2 = typeof date2 === 'string' ? parseDateInTimezone(date2, timezone) : date2;

  const zoned1 = tzUtcToZonedTime(d1, timezone);
  const zoned2 = tzUtcToZonedTime(d2, timezone);

  return isSameDay(zoned1, zoned2);
}

/**
 * Get start of day in the specified timezone
 */
export function startOfDayInTimezone(date: Date | string, timezone: string = getUserTimezone()): Date {
  const dateObj = typeof date === 'string' ? parseDateInTimezone(date, timezone) : date;
  const zonedDate = tzUtcToZonedTime(dateObj, timezone);
  const startOfDayZoned = startOfDay(zonedDate);
  return tzZonedTimeToUtc(startOfDayZoned, timezone);
}

/**
 * Get end of day in the specified timezone
 */
export function endOfDayInTimezone(date: Date | string, timezone: string = getUserTimezone()): Date {
  const dateObj = typeof date === 'string' ? parseDateInTimezone(date, timezone) : date;
  const zonedDate = tzUtcToZonedTime(dateObj, timezone);
  const endOfDayZoned = endOfDay(zonedDate);
  return tzZonedTimeToUtc(endOfDayZoned, timezone);
}

/**
 * Convert a date to UTC ISO string for API calls
 */
export function toUtcISOString(date: Date | string, timezone: string = getUserTimezone()): string {
  const dateObj = typeof date === 'string' ? parseDateInTimezone(date, timezone) : date;
  return dateObj.toISOString();
}

/**
 * Create a date object from date and time strings in the specified timezone
 */
export function createDateFromStrings(
  dateStr: string,
  timeStr: string,
  timezone: string = getUserTimezone()
): Date {
  const dateTimeStr = `${dateStr}T${timeStr}`;
  return tzZonedTimeToUtc(dateTimeStr, timezone);
}

/**
 * Check if a date is in the past (considering timezone)
 */
export function isInPast(date: Date | string, timezone: string = getUserTimezone()): boolean {
  const dateObj = typeof date === 'string' ? parseDateInTimezone(date, timezone) : date;
  const now = new Date();
  return dateObj < now;
}

/**
 * Get current date/time in the specified timezone
 */
export function nowInTimezone(timezone: string = getUserTimezone()): Date {
  return tzUtcToZonedTime(new Date(), timezone);
}

/**
 * Convert Google Calendar date format to our internal format
 * Google returns either dateTime (with timezone) or date (all-day)
 */
export function parseGoogleDate(dateObj: any, timezone: string = getUserTimezone()): Date {
  if (dateObj.dateTime) {
    // Timed event - Google provides ISO string with timezone
    return parseISO(dateObj.dateTime);
  } else if (dateObj.date) {
    // All-day event - Google provides date string (YYYY-MM-DD)
    // All-day events are stored as start of day in UTC
    return tzZonedTimeToUtc(`${dateObj.date}T00:00:00`, timezone);
  }
  throw new Error('Invalid Google date format');
}

/**
 * Format date for Google Calendar API
 * Returns the appropriate format based on whether it's an all-day event
 */
export function formatForGoogleCalendar(
  date: Date,
  isAllDay: boolean = false,
  timezone: string = getUserTimezone()
): any {
  if (isAllDay) {
    // All-day events use date field
    return {
      date: formatInTimeZone(date, timezone, 'yyyy-MM-dd'),
    };
  } else {
    // Timed events use dateTime and timeZone
    return {
      dateTime: toUtcISOString(date, timezone),
      timeZone: timezone,
    };
  }
}