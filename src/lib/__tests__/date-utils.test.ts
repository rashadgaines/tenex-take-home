import {
  parseDateInTimezone,
  formatDateInTimezone,
  isSameDayInTimezone,
  startOfDayInTimezone,
  endOfDayInTimezone,
  createDateFromStrings,
  isInPast,
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
  });

  describe('isInPast', () => {
    it('should correctly identify past dates', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

      expect(isInPast(pastDate, 'UTC')).toBe(true);
      expect(isInPast(futureDate, 'UTC')).toBe(false);
    });
  });

  describe('formatDateInTimezone', () => {
    it('should format dates correctly in specified timezone', () => {
      const date = new Date('2024-01-15T19:30:00Z'); // 7:30 PM UTC

      const result = formatDateInTimezone(date, 'yyyy-MM-dd HH:mm', 'America/New_York');
      expect(result).toBe('2024-01-15 14:30'); // 2:30 PM EST
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