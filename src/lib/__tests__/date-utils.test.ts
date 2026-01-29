import { describe, it, expect } from 'vitest';
import {
  parseDateInTimezone,
  formatDateInTimezone,
  isSameDayInTimezone,
  startOfDayInTimezone,
  endOfDayInTimezone,
  createDateFromStrings,
  isInPast,
  formatForGoogleCalendar,
  toUtcISOString,
  nowInTimezone,
  parseGoogleDate,
  DEFAULT_TIMEZONE,
} from '../date-utils';

describe('Date Utils', () => {
  describe('parseDateInTimezone', () => {
    it('should parse ISO datetime strings correctly', () => {
      const dateStr = '2024-01-15T14:30:00Z';
      const result = parseDateInTimezone(dateStr, 'America/New_York');
      expect(result.toISOString()).toBe('2024-01-15T14:30:00.000Z');
    });

    it('should handle timezone conversion for date-time strings', () => {
      const dateStr = '2024-01-15T14:30:00';
      const result = parseDateInTimezone(dateStr, 'America/New_York');
      // Should interpret as New York time and convert to UTC
      expect(result.toISOString()).toBe('2024-01-15T19:30:00.000Z');
    });

    it('should parse ISO strings with timezone offset', () => {
      const result = parseDateInTimezone('2024-06-15T14:30:00+05:00', 'America/Los_Angeles');
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).not.toBeNaN();
    });

    it('should handle date-only strings', () => {
      const result = parseDateInTimezone('2024-06-15', 'America/Los_Angeles');
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).not.toBeNaN();
    });
  });

  describe('isSameDayInTimezone', () => {
    it('should correctly identify same day across timezones', () => {
      // Event at 11 PM EST (which is 4 AM UTC next day)
      const date1 = new Date('2024-01-15T04:00:00Z');
      // Same logical day in New York timezone
      const date2 = new Date('2024-01-14T19:00:00Z'); // 2 PM EST = 7 PM UTC

      const result = isSameDayInTimezone(date1, date2, 'America/New_York');
      expect(result).toBe(false); // Different days
    });

    it('should return true for same day in timezone', () => {
      const date1 = new Date('2024-01-15T12:00:00Z');
      const date2 = new Date('2024-01-15T15:00:00Z');

      const result = isSameDayInTimezone(date1, date2, 'America/New_York');
      expect(result).toBe(true);
    });

    it('should return true for same day dates in UTC', () => {
      const date1 = new Date('2024-06-15T10:00:00Z');
      const date2 = new Date('2024-06-15T22:00:00Z');
      expect(isSameDayInTimezone(date1, date2, 'UTC')).toBe(true);
    });

    it('should return false for different day dates', () => {
      const date1 = new Date('2024-06-15T10:00:00Z');
      const date2 = new Date('2024-06-16T10:00:00Z');
      expect(isSameDayInTimezone(date1, date2, 'UTC')).toBe(false);
    });

    it('should handle timezone boundary correctly', () => {
      // These are the same UTC day but different LA days
      const date1 = new Date('2024-06-15T05:00:00Z'); // June 14, 10 PM in LA
      const date2 = new Date('2024-06-15T10:00:00Z'); // June 15, 3 AM in LA

      expect(isSameDayInTimezone(date1, date2, 'UTC')).toBe(true);
      expect(isSameDayInTimezone(date1, date2, 'America/Los_Angeles')).toBe(false);
    });

    it('should handle string dates', () => {
      const result = isSameDayInTimezone(
        '2024-06-15T10:00:00Z',
        '2024-06-15T22:00:00Z',
        'UTC'
      );
      expect(result).toBe(true);
    });
  });

  describe('startOfDayInTimezone and endOfDayInTimezone', () => {
    it('should calculate correct day boundaries in timezone', () => {
      const date = new Date('2024-01-15T12:00:00Z'); // Noon UTC

      const start = startOfDayInTimezone(date, 'America/New_York');
      const end = endOfDayInTimezone(date, 'America/New_York');

      // In New York (EST), this should be:
      // Start: 2024-01-15T05:00:00Z (midnight EST)
      // End: 2024-01-15T05:00:00Z + 24 hours
      expect(start.getUTCHours()).toBe(5); // 00:00 EST = 05:00 UTC
      expect(end.getUTCHours()).toBe(5); // 23:59:59.999 EST = next day 04:59:59.999 UTC
      expect(end.getUTCDate()).toBe(16); // Next day
    });

    it('should return midnight for start of day in UTC', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = startOfDayInTimezone(date, 'UTC');

      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
    });

    it('should return end of day in UTC', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = endOfDayInTimezone(date, 'UTC');

      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
    });
  });

  describe('createDateFromStrings', () => {
    it('should create correct UTC date from date and time strings', () => {
      const result = createDateFromStrings('2024-01-15', '14:30', 'America/New_York');

      // 2:30 PM EST on Jan 15 should be 7:30 PM UTC on Jan 15
      expect(result.toISOString()).toBe('2024-01-15T19:30:00.000Z');
    });

    it('should handle daylight saving time correctly', () => {
      // During DST (March)
      const result = createDateFromStrings('2024-03-15', '14:30', 'America/New_York');

      // 2:30 PM EDT should be 6:30 PM UTC
      expect(result.toISOString()).toBe('2024-03-15T18:30:00.000Z');
    });

    it('should create a date from date and time strings in UTC timezone', () => {
      const date = createDateFromStrings('2024-06-15', '14:30', 'UTC');

      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCHours()).toBe(14);
      expect(date.getUTCMinutes()).toBe(30);
    });

    it('should handle midnight correctly', () => {
      const date = createDateFromStrings('2024-06-15', '00:00', 'America/Los_Angeles');

      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).not.toBeNaN();
    });

    it('should handle end of day correctly', () => {
      const date = createDateFromStrings('2024-06-15', '23:59', 'America/Los_Angeles');

      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).not.toBeNaN();
    });

    it('should create different UTC times for different timezones with same local time', () => {
      const laDate = createDateFromStrings('2024-06-15', '14:30', 'America/Los_Angeles');
      const nyDate = createDateFromStrings('2024-06-15', '14:30', 'America/New_York');

      // NY is 3 hours ahead of LA, so the UTC time should differ by 3 hours
      const diffMs = laDate.getTime() - nyDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      expect(diffHours).toBe(3);
    });
  });

  describe('isInPast', () => {
    it('should correctly identify past dates', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

      expect(isInPast(pastDate, 'UTC')).toBe(true);
      expect(isInPast(futureDate, 'UTC')).toBe(false);
    });

    it('should return true for dates in the distant past', () => {
      const pastDate = new Date('2020-01-01T10:00:00Z');
      expect(isInPast(pastDate, 'UTC')).toBe(true);
    });

    it('should return false for dates in the distant future', () => {
      const futureDate = new Date('2099-12-31T23:59:59Z');
      expect(isInPast(futureDate, 'UTC')).toBe(false);
    });

    it('should handle string dates', () => {
      const pastDateStr = '2020-01-01T10:00:00Z';
      expect(isInPast(pastDateStr, 'UTC')).toBe(true);
    });

    it('should handle date comparison across timezones', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      expect(isInPast(oneHourAgo, 'America/Los_Angeles')).toBe(true);
    });
  });

  describe('formatDateInTimezone', () => {
    it('should format dates correctly in specified timezone', () => {
      const date = new Date('2024-01-15T19:30:00Z'); // 7:30 PM UTC

      const result = formatDateInTimezone(date, 'yyyy-MM-dd HH:mm', 'America/New_York');
      expect(result).toBe('2024-01-15 14:30'); // 2:30 PM EST
    });

    it('should format a date in UTC', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = formatDateInTimezone(date, 'yyyy-MM-dd HH:mm', 'UTC');

      expect(result).toBe('2024-06-15 14:30');
    });

    it('should handle string dates', () => {
      const result = formatDateInTimezone('2024-06-15T14:30:00Z', 'yyyy-MM-dd', 'UTC');

      expect(result).toBe('2024-06-15');
    });

    it('should apply timezone offset correctly', () => {
      const date = new Date('2024-06-15T00:00:00Z');
      const laResult = formatDateInTimezone(date, 'yyyy-MM-dd', 'America/Los_Angeles');

      // In LA (PDT, UTC-7), midnight UTC is 5 PM the previous day
      expect(laResult).toBe('2024-06-14');
    });

    it('should support various format strings', () => {
      const date = new Date('2024-06-15T14:30:00Z');

      expect(formatDateInTimezone(date, 'HH:mm', 'UTC')).toBe('14:30');
      expect(formatDateInTimezone(date, 'EEEE', 'UTC')).toBe('Saturday');
      expect(formatDateInTimezone(date, 'MMMM d, yyyy', 'UTC')).toBe('June 15, 2024');
    });
  });

  describe('formatForGoogleCalendar', () => {
    it('should format timed events with dateTime and timeZone', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = formatForGoogleCalendar(date, false, 'America/Los_Angeles');

      expect(result).toHaveProperty('dateTime');
      expect(result).toHaveProperty('timeZone');
      expect(result.timeZone).toBe('America/Los_Angeles');
      expect(typeof result.dateTime).toBe('string');
    });

    it('should format all-day events with date only', () => {
      const date = new Date('2024-06-15T00:00:00Z');
      const result = formatForGoogleCalendar(date, true, 'America/Los_Angeles');

      expect(result).toHaveProperty('date');
      expect(result).not.toHaveProperty('dateTime');
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return ISO string for dateTime', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = formatForGoogleCalendar(date, false, 'UTC');

      expect(result.dateTime).toBe(date.toISOString());
    });

    it('should use correct timezone for timed events', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = formatForGoogleCalendar(date, false, 'America/New_York');

      expect(result.timeZone).toBe('America/New_York');
    });
  });

  describe('toUtcISOString', () => {
    it('should convert a date to UTC ISO string', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = toUtcISOString(date, 'America/Los_Angeles');

      expect(result).toBe('2024-06-15T14:30:00.000Z');
    });

    it('should handle string input', () => {
      const result = toUtcISOString('2024-06-15T14:30:00Z', 'UTC');

      expect(result).toBe('2024-06-15T14:30:00.000Z');
    });
  });

  describe('nowInTimezone', () => {
    it('should return current time as a valid Date', () => {
      const result = nowInTimezone('America/Los_Angeles');

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).not.toBeNaN();
    });

    it('should return a date close to current time', () => {
      const before = Date.now();
      const result = nowInTimezone('UTC');
      const after = Date.now();

      // The result should be within a reasonable range
      expect(result.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(result.getTime()).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('parseGoogleDate', () => {
    it('should parse timed events with dateTime field', () => {
      const googleDate = {
        dateTime: '2024-06-15T14:30:00-07:00',
        timeZone: 'America/Los_Angeles',
      };

      const result = parseGoogleDate(googleDate, 'America/Los_Angeles');

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).not.toBeNaN();
    });

    it('should parse all-day events with date field', () => {
      const googleDate = {
        date: '2024-06-15',
      };

      const result = parseGoogleDate(googleDate, 'America/Los_Angeles');

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).not.toBeNaN();
    });

    it('should throw error for invalid format', () => {
      const invalidDate = {};

      expect(() => parseGoogleDate(invalidDate, 'America/Los_Angeles')).toThrow('Invalid Google date format');
    });

    it('should parse UTC ISO string from dateTime', () => {
      const googleDate = {
        dateTime: '2024-06-15T21:30:00Z',
      };

      const result = parseGoogleDate(googleDate, 'UTC');
      expect(result.toISOString()).toBe('2024-06-15T21:30:00.000Z');
    });
  });

  describe('DEFAULT_TIMEZONE', () => {
    it('should be America/Los_Angeles', () => {
      expect(DEFAULT_TIMEZONE).toBe('America/Los_Angeles');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid timezone gracefully', () => {
      const dateStr = '2024-01-15T14:30:00';
      const result = parseDateInTimezone(dateStr, 'Invalid/Timezone');

      // Should fall back to default parsing
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
      expect(() => parseDateInTimezone('', 'UTC')).not.toThrow();
      expect(() => parseDateInTimezone(null as any, 'UTC')).not.toThrow();
    });
  });
});
