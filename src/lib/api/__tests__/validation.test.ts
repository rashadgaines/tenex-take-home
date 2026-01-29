import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateEmail,
  validateDateRange,
  validateTimeFormat,
  validateTimezone,
  validateEmailArray,
  validateNumberRange,
  combineValidations,
  ValidationResult,
} from '../validation';

describe('API Validation', () => {
  describe('validateRequired', () => {
    it('should return valid for non-empty string', () => {
      const result = validateRequired('hello', 'name');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for null value', () => {
      const result = validateRequired(null, 'name');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('name is required');
    });

    it('should return invalid for undefined value', () => {
      const result = validateRequired(undefined, 'name');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('name is required');
    });

    it('should return invalid for empty string', () => {
      const result = validateRequired('', 'name');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('name cannot be empty');
    });

    it('should return invalid for whitespace-only string', () => {
      const result = validateRequired('   ', 'name');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('name cannot be empty');
    });

    it('should return invalid for empty array', () => {
      const result = validateRequired([], 'items');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('items cannot be empty');
    });

    it('should return valid for non-empty array', () => {
      const result = validateRequired(['item1'], 'items');
      expect(result.valid).toBe(true);
    });

    it('should return valid for number zero', () => {
      const result = validateRequired(0, 'count');
      expect(result.valid).toBe(true);
    });

    it('should return valid for boolean false', () => {
      const result = validateRequired(false, 'flag');
      expect(result.valid).toBe(true);
    });

    it('should return valid for object', () => {
      const result = validateRequired({ key: 'value' }, 'data');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should return valid for valid email address', () => {
      const result = validateEmail('user@example.com');
      expect(result.valid).toBe(true);
    });

    it('should return valid for email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.valid).toBe(true);
    });

    it('should return valid for email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for email without @', () => {
      const result = validateEmail('userexample.com');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email address: userexample.com');
    });

    it('should return invalid for email without domain', () => {
      const result = validateEmail('user@');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for email without TLD', () => {
      const result = validateEmail('user@example');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for non-string input', () => {
      const result = validateEmail(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email must be a string');
    });

    it('should return invalid for null input', () => {
      const result = validateEmail(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email must be a string');
    });

    it('should return invalid for email with spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    it('should return valid for valid date range', () => {
      const result = validateDateRange(
        '2024-01-15T10:00:00Z',
        '2024-01-15T12:00:00Z'
      );
      expect(result.valid).toBe(true);
    });

    it('should return invalid when start equals end', () => {
      const result = validateDateRange(
        '2024-01-15T10:00:00Z',
        '2024-01-15T10:00:00Z'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start date must be before end date');
    });

    it('should return invalid when start is after end', () => {
      const result = validateDateRange(
        '2024-01-15T14:00:00Z',
        '2024-01-15T10:00:00Z'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start date must be before end date');
    });

    it('should return invalid for missing start date', () => {
      const result = validateDateRange(null, '2024-01-15T12:00:00Z');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start and end dates are required');
    });

    it('should return invalid for missing end date', () => {
      const result = validateDateRange('2024-01-15T10:00:00Z', null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start and end dates are required');
    });

    it('should return invalid for invalid start date format', () => {
      const result = validateDateRange('not-a-date', '2024-01-15T12:00:00Z');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid start date format. Use ISO 8601 format.');
    });

    it('should return invalid for invalid end date format', () => {
      const result = validateDateRange('2024-01-15T10:00:00Z', 'not-a-date');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid end date format. Use ISO 8601 format.');
    });

    it('should accept Date objects', () => {
      const start = new Date('2024-01-15T10:00:00Z');
      const end = new Date('2024-01-15T12:00:00Z');
      const result = validateDateRange(start, end);
      expect(result.valid).toBe(true);
    });

    it('should accept timestamps', () => {
      const start = Date.now();
      const end = start + 3600000; // 1 hour later
      const result = validateDateRange(start, end);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTimeFormat', () => {
    it('should return valid for valid 24-hour time', () => {
      const result = validateTimeFormat('14:30');
      expect(result.valid).toBe(true);
    });

    it('should return valid for midnight', () => {
      const result = validateTimeFormat('00:00');
      expect(result.valid).toBe(true);
    });

    it('should return valid for end of day', () => {
      const result = validateTimeFormat('23:59');
      expect(result.valid).toBe(true);
    });

    it('should return valid for single digit hour', () => {
      const result = validateTimeFormat('9:30');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for invalid hour', () => {
      const result = validateTimeFormat('25:00');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid time format. Use HH:mm format.');
    });

    it('should return invalid for invalid minute', () => {
      const result = validateTimeFormat('14:60');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid time format. Use HH:mm format.');
    });

    it('should return invalid for non-string input', () => {
      const result = validateTimeFormat(1430);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Time must be a string');
    });

    it('should return invalid for time with seconds', () => {
      const result = validateTimeFormat('14:30:00');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for 12-hour format', () => {
      const result = validateTimeFormat('2:30 PM');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTimezone', () => {
    it('should return valid for valid timezone', () => {
      const result = validateTimezone('America/New_York');
      expect(result.valid).toBe(true);
    });

    it('should return valid for UTC', () => {
      const result = validateTimezone('UTC');
      expect(result.valid).toBe(true);
    });

    it('should return valid for America/Los_Angeles', () => {
      const result = validateTimezone('America/Los_Angeles');
      expect(result.valid).toBe(true);
    });

    it('should return valid for Europe/London', () => {
      const result = validateTimezone('Europe/London');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for invalid timezone', () => {
      const result = validateTimezone('Invalid/Timezone');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid timezone');
    });

    it('should return invalid for non-string input', () => {
      const result = validateTimezone(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Timezone must be a string');
    });

    it('should return invalid for null input', () => {
      const result = validateTimezone(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEmailArray', () => {
    it('should return valid for array of valid emails', () => {
      const result = validateEmailArray([
        'user1@example.com',
        'user2@example.com',
      ]);
      expect(result.valid).toBe(true);
    });

    it('should return valid for empty array', () => {
      const result = validateEmailArray([]);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for non-array input', () => {
      const result = validateEmailArray('user@example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Emails must be an array');
    });

    it('should return invalid if any email is invalid', () => {
      const result = validateEmailArray([
        'user1@example.com',
        'invalid-email',
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email address: invalid-email');
    });

    it('should use custom field name in error message', () => {
      const result = validateEmailArray('not-an-array', 'Attendees');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Attendees must be an array');
    });
  });

  describe('validateNumberRange', () => {
    it('should return valid for number within range', () => {
      const result = validateNumberRange(5, 'count', 1, 10);
      expect(result.valid).toBe(true);
    });

    it('should return valid for number at minimum', () => {
      const result = validateNumberRange(1, 'count', 1, 10);
      expect(result.valid).toBe(true);
    });

    it('should return valid for number at maximum', () => {
      const result = validateNumberRange(10, 'count', 1, 10);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for number below minimum', () => {
      const result = validateNumberRange(0, 'count', 1, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('count must be between 1 and 10');
    });

    it('should return invalid for number above maximum', () => {
      const result = validateNumberRange(11, 'count', 1, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('count must be between 1 and 10');
    });

    it('should return invalid for non-number input', () => {
      const result = validateNumberRange('5', 'count', 1, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('count must be a number');
    });

    it('should handle negative ranges', () => {
      const result = validateNumberRange(-5, 'offset', -10, 0);
      expect(result.valid).toBe(true);
    });

    it('should handle decimal numbers', () => {
      const result = validateNumberRange(5.5, 'rating', 1, 10);
      expect(result.valid).toBe(true);
    });
  });

  describe('combineValidations', () => {
    it('should return valid when all validations pass', () => {
      const result = combineValidations(
        { valid: true },
        { valid: true },
        { valid: true }
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return first error when first validation fails', () => {
      const result = combineValidations(
        { valid: false, error: 'First error' },
        { valid: true },
        { valid: false, error: 'Third error' }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('First error');
    });

    it('should return second error when first passes but second fails', () => {
      const result = combineValidations(
        { valid: true },
        { valid: false, error: 'Second error' },
        { valid: false, error: 'Third error' }
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Second error');
    });

    it('should handle single validation', () => {
      const result = combineValidations({ valid: true });
      expect(result.valid).toBe(true);
    });

    it('should handle no validations', () => {
      const result = combineValidations();
      expect(result.valid).toBe(true);
    });

    it('should work with actual validation functions', () => {
      const result = combineValidations(
        validateRequired('test', 'name'),
        validateEmail('user@example.com'),
        validateTimezone('UTC')
      );
      expect(result.valid).toBe(true);
    });

    it('should return first invalid result from validation functions', () => {
      const result = combineValidations(
        validateRequired('test', 'name'),
        validateEmail('invalid-email'),
        validateTimezone('UTC')
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email address: invalid-email');
    });
  });

  describe('integration scenarios', () => {
    it('should validate a complete event creation request', () => {
      const eventData = {
        title: 'Team Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        timezone: 'America/New_York',
        attendees: ['user1@example.com', 'user2@example.com'],
      };

      const validation = combineValidations(
        validateRequired(eventData.title, 'title'),
        validateDateRange(eventData.start, eventData.end),
        validateTimezone(eventData.timezone),
        validateEmailArray(eventData.attendees, 'attendees')
      );

      expect(validation.valid).toBe(true);
    });

    it('should fail validation for invalid event request', () => {
      const eventData = {
        title: '',
        start: '2024-01-15T12:00:00Z',
        end: '2024-01-15T10:00:00Z', // End before start
        timezone: 'Invalid/TZ',
        attendees: ['not-an-email'],
      };

      const titleValidation = validateRequired(eventData.title, 'title');
      expect(titleValidation.valid).toBe(false);

      const dateValidation = validateDateRange(eventData.start, eventData.end);
      expect(dateValidation.valid).toBe(false);

      const tzValidation = validateTimezone(eventData.timezone);
      expect(tzValidation.valid).toBe(false);

      const emailValidation = validateEmailArray(eventData.attendees);
      expect(emailValidation.valid).toBe(false);
    });
  });
});
