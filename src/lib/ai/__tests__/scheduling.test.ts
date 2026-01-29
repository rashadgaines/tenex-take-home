import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateId,
  detectSuggestedActions,
  getTomorrowDate,
  cleanJsonResponse,
} from '../chat/utils';

// Mock OpenAI - we test the utility functions directly without making API calls
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

describe('Scheduling Utilities', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with expected format', () => {
      const id = generateId();

      // ID should contain a timestamp and random string
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should generate IDs starting with timestamp', () => {
      const before = Date.now();
      const id = generateId();
      const after = Date.now();

      const timestamp = parseInt(id.split('-')[0]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('detectSuggestedActions', () => {
    it('should suggest times when discussing scheduling and availability', () => {
      const actions = detectSuggestedActions(
        'You have some available slots tomorrow afternoon.',
        'I need to schedule a meeting'
      );

      expect(actions).toContainEqual({
        label: 'Suggest times',
        action: 'suggest_times',
      });
    });

    it('should suggest times when response mentions free time', () => {
      const actions = detectSuggestedActions(
        'You are free between 2pm and 4pm.',
        'When can I schedule a call?'
      );

      expect(actions).toContainEqual({
        label: 'Suggest times',
        action: 'suggest_times',
      });
    });

    it('should suggest draft email when discussing emails', () => {
      const actions = detectSuggestedActions(
        'I can help you draft that.',
        'I need to send an email to the team'
      );

      expect(actions).toContainEqual({
        label: 'Draft email',
        action: 'send_email',
      });
    });

    it('should suggest edit when response mentions editing', () => {
      const actions = detectSuggestedActions(
        'You can edit the event details.',
        'How do I change the meeting time?'
      );

      expect(actions).toContainEqual({
        label: 'Edit',
        action: 'edit',
      });
    });

    it('should suggest edit when response mentions changes', () => {
      const actions = detectSuggestedActions(
        'I can make that change for you.',
        'Can you update the meeting?'
      );

      expect(actions).toContainEqual({
        label: 'Edit',
        action: 'edit',
      });
    });

    it('should limit actions to 3', () => {
      const actions = detectSuggestedActions(
        'You have available time and can edit or change things.',
        'I need to schedule a meeting and send an email'
      );

      expect(actions.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for unrelated messages', () => {
      const actions = detectSuggestedActions(
        'Hello! How can I help you today?',
        'Hi there'
      );

      expect(actions).toEqual([]);
    });

    it('should not suggest times without availability mention', () => {
      const actions = detectSuggestedActions(
        'Your meeting has been scheduled.',
        'Schedule a meeting tomorrow'
      );

      expect(actions).not.toContainEqual({
        label: 'Suggest times',
        action: 'suggest_times',
      });
    });
  });

  describe('getTomorrowDate', () => {
    it('should return tomorrow date in YYYY-MM-DD format', () => {
      const result = getTomorrowDate();

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return the correct tomorrow date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expected = tomorrow.toISOString().split('T')[0];

      expect(getTomorrowDate()).toBe(expected);
    });
  });

  describe('cleanJsonResponse', () => {
    it('should remove markdown code block markers', () => {
      const input = '```json\n{"key": "value"}\n```';
      const result = cleanJsonResponse(input);

      expect(result).toBe('{"key": "value"}');
    });

    it('should handle text before JSON', () => {
      const input = 'Here is the result:\n{"key": "value"}';
      const result = cleanJsonResponse(input);

      expect(result).toBe('{"key": "value"}');
    });

    it('should handle text after JSON', () => {
      const input = '{"key": "value"}\nThat\'s the output.';
      const result = cleanJsonResponse(input);

      expect(result).toBe('{"key": "value"}');
    });

    it('should handle clean JSON input', () => {
      const input = '{"key": "value"}';
      const result = cleanJsonResponse(input);

      expect(result).toBe('{"key": "value"}');
    });

    it('should handle nested JSON objects', () => {
      const input = '```json\n{"outer": {"inner": "value"}}\n```';
      const result = cleanJsonResponse(input);

      expect(result).toBe('{"outer": {"inner": "value"}}');
    });
  });
});

describe('Meeting Extraction Patterns', () => {
  describe('scheduling request detection patterns', () => {
    const schedulingPatterns = [
      /schedule.*meeting/i,
      /set up.*meeting/i,
      /create.*meeting/i,
      /book.*meeting/i,
      /schedule.*call/i,
      /set up.*call/i,
      /add.*event/i,
      /create.*event/i,
      /block.*time/i,
      /schedule.*appointment/i,
      /book.*appointment/i,
      /plan.*meeting/i,
      /organize.*meeting/i,
    ];

    const testMessages = [
      { message: 'Schedule a meeting with John tomorrow', expected: true },
      { message: 'Set up a meeting with the team', expected: true },
      { message: 'Create a meeting for project review', expected: true },
      { message: 'Book a meeting room for Friday', expected: true },
      { message: 'Schedule a call with the client', expected: true },
      { message: 'Set up a call with Sarah', expected: true },
      { message: 'Add an event for the conference', expected: true },
      { message: 'Create an event for the team outing', expected: true },
      { message: 'Block time for focused work', expected: true },
      { message: 'Schedule an appointment with the doctor', expected: true },
      { message: 'Book an appointment for next week', expected: true },
      { message: 'Plan a meeting to discuss roadmap', expected: true },
      { message: 'Organize a meeting for the quarterly review', expected: true },
      { message: 'What is the weather today?', expected: false },
      { message: 'Tell me about my calendar', expected: false },
      { message: 'When is my next meeting?', expected: false },
    ];

    testMessages.forEach(({ message, expected }) => {
      it(`should ${expected ? 'match' : 'not match'}: "${message}"`, () => {
        const matches = schedulingPatterns.some((pattern) => pattern.test(message));
        expect(matches).toBe(expected);
      });
    });
  });

  describe('protected time patterns', () => {
    const protectedTimePatterns = [
      /block.*(?:my|the)?\s*(?:mornings?|afternoons?|evenings?|lunch|time)/i,
      /protect.*(?:my|the)?\s*(?:mornings?|afternoons?|evenings?|time)/i,
      /don't.*schedule.*(?:during|before|after)/i,
      /keep.*(?:free|open|clear)/i,
      /add.*protected\s*time/i,
      /reserve.*time.*for/i,
      /block.*(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    ];

    const testMessages = [
      { message: 'Block my mornings for focused work', expected: true },
      { message: 'Protect my afternoons from meetings', expected: true },
      { message: "Don't schedule anything before 10am", expected: true },
      { message: 'Keep Fridays free for deep work', expected: true },
      { message: 'Add protected time for exercise', expected: true },
      { message: 'Reserve time for lunch', expected: true },
      { message: 'Block 9am to 11am for coding', expected: true },
      { message: 'Schedule a meeting at 10am', expected: false },
      { message: 'What is my schedule today?', expected: false },
    ];

    testMessages.forEach(({ message, expected }) => {
      it(`should ${expected ? 'match' : 'not match'}: "${message}"`, () => {
        const matches = protectedTimePatterns.some((pattern) => pattern.test(message));
        expect(matches).toBe(expected);
      });
    });
  });

  describe('email extraction patterns', () => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    it('should extract single email from message', () => {
      const message = 'Schedule a meeting with john@example.com tomorrow';
      const emails = message.match(emailRegex);

      expect(emails).toEqual(['john@example.com']);
    });

    it('should extract multiple emails from message', () => {
      const message = 'Set up a call with alice@company.com and bob@org.net';
      const emails = message.match(emailRegex);

      expect(emails).toEqual(['alice@company.com', 'bob@org.net']);
    });

    it('should extract email with subdomain', () => {
      const message = 'Meeting with user@mail.example.com';
      const emails = message.match(emailRegex);

      expect(emails).toEqual(['user@mail.example.com']);
    });

    it('should extract email with plus sign', () => {
      const message = 'Send to user+tag@example.com';
      const emails = message.match(emailRegex);

      expect(emails).toEqual(['user+tag@example.com']);
    });

    it('should return null for message without email', () => {
      const message = 'Schedule a meeting with John tomorrow';
      const emails = message.match(emailRegex);

      expect(emails).toBeNull();
    });
  });

  describe('date parsing patterns', () => {
    const datePatterns = {
      tomorrow: /tomorrow/i,
      today: /today/i,
      nextWeek: /next\s*week/i,
      nextMonday: /next\s*monday|monday/i,
      friday: /friday/i,
    };

    it('should detect tomorrow', () => {
      const message = 'Schedule for tomorrow at 2pm';
      expect(datePatterns.tomorrow.test(message)).toBe(true);
    });

    it('should detect today', () => {
      const message = 'Can we meet today?';
      expect(datePatterns.today.test(message)).toBe(true);
    });

    it('should detect next week', () => {
      const message = 'Set up a meeting next week';
      expect(datePatterns.nextWeek.test(message)).toBe(true);
    });

    it('should detect Monday', () => {
      const message = 'Book for next Monday';
      expect(datePatterns.nextMonday.test(message)).toBe(true);
    });

    it('should detect Friday', () => {
      const message = 'Schedule for Friday afternoon';
      expect(datePatterns.friday.test(message)).toBe(true);
    });
  });

  describe('time parsing patterns', () => {
    const timeRegex = /^(\d{1,2}):(\d{2})$/;

    const validTimes = ['9:00', '09:00', '14:30', '23:59', '00:00'];
    const invalidTimes = ['25:00', '14:60', '9:0', '9', '2:30 PM'];

    validTimes.forEach((time) => {
      it(`should validate time format: ${time}`, () => {
        expect(timeRegex.test(time)).toBe(true);
      });
    });

    invalidTimes.forEach((time) => {
      it(`should reject invalid time format: ${time}`, () => {
        expect(timeRegex.test(time)).toBe(false);
      });
    });
  });

  describe('attendee email validation', () => {
    const validateEmail = (email: unknown): boolean => {
      if (typeof email !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email) && email.length <= 254;
    };

    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('user.name@company.org')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(validateEmail(123)).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
      expect(validateEmail(['user@example.com'])).toBe(false);
    });

    it('should reject overly long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });
});

describe('Multi-meeting detection', () => {
  describe('batch meeting patterns', () => {
    const isBatchMeetingRequest = (message: string): boolean => {
      const lowerMessage = message.toLowerCase();

      // Patterns that indicate multiple separate meetings
      const batchPatterns = [
        /meetings?\s+with\s+.+(?:,|and)\s+.+/i, // meetings with A, B, and C
        /schedule\s+(?:meetings?|calls?)\s+with\s+(?:each|all|multiple)/i,
        /(?:three|four|five|\d+)\s+(?:separate\s+)?meetings?/i,
      ];

      // Patterns that indicate a single meeting with multiple attendees
      const singleMeetingPatterns = [
        /team\s+meeting/i,
        /group\s+(?:meeting|call)/i,
        /all\s+hands/i,
        /everyone/i,
      ];

      const matchesBatch = batchPatterns.some((p) => p.test(lowerMessage));
      const matchesSingle = singleMeetingPatterns.some((p) => p.test(lowerMessage));

      return matchesBatch && !matchesSingle;
    };

    it('should detect batch meeting requests', () => {
      expect(isBatchMeetingRequest('Schedule meetings with Joe, Dan, and Sally')).toBe(true);
      expect(isBatchMeetingRequest('I need three separate meetings')).toBe(true);
    });

    it('should not flag single meetings with multiple attendees', () => {
      expect(isBatchMeetingRequest('Team meeting with Joe, Dan, and Sally')).toBe(false);
      expect(isBatchMeetingRequest('Group call with the engineering team')).toBe(false);
    });
  });
});
