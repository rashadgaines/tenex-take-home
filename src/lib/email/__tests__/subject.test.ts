import { describe, it, expect } from 'vitest';
import { generateSubjectLine, generateAlternativeSubjects } from '../subject';

describe('generateSubjectLine', () => {
  describe('meeting-related purposes', () => {
    it('should return "Meeting Request" for purposes containing "meeting"', () => {
      expect(generateSubjectLine('schedule a meeting')).toBe('Meeting Request');
      expect(generateSubjectLine('meeting with client')).toBe('Meeting Request');
      expect(generateSubjectLine('team meeting')).toBe('Meeting Request');
    });

    it('should return "Meeting Request" for purposes containing "schedule"', () => {
      expect(generateSubjectLine('schedule a call')).toBe('Meeting Request');
      expect(generateSubjectLine('schedule discussion')).toBe('Meeting Request');
    });

    it('should be case insensitive for meeting purposes', () => {
      expect(generateSubjectLine('MEETING REQUEST')).toBe('Meeting Request');
      expect(generateSubjectLine('Meeting Tomorrow')).toBe('Meeting Request');
      expect(generateSubjectLine('SCHEDULE call')).toBe('Meeting Request');
    });
  });

  describe('follow-up purposes', () => {
    it('should return "Following Up" for purposes containing "follow up" (with space)', () => {
      expect(generateSubjectLine('follow up on proposal')).toBe('Following Up');
      expect(generateSubjectLine('quick follow up')).toBe('Following Up');
    });

    it('should return "Following Up" for purposes containing "followup" (without space)', () => {
      expect(generateSubjectLine('followup from yesterday')).toBe('Following Up');
      expect(generateSubjectLine('project followup')).toBe('Following Up');
    });

    it('should be case insensitive for follow-up purposes', () => {
      expect(generateSubjectLine('FOLLOW UP')).toBe('Following Up');
      expect(generateSubjectLine('Follow Up on this')).toBe('Following Up');
      expect(generateSubjectLine('FOLLOWUP')).toBe('Following Up');
    });
  });

  describe('introduction purposes', () => {
    it('should return "Introduction" for purposes containing "introduction"', () => {
      expect(generateSubjectLine('introduction to the team')).toBe('Introduction');
      expect(generateSubjectLine('brief introduction')).toBe('Introduction');
    });

    it('should return "Introduction" for purposes containing "introduce"', () => {
      expect(generateSubjectLine('introduce myself')).toBe('Introduction');
      expect(generateSubjectLine('let me introduce')).toBe('Introduction');
    });

    it('should be case insensitive for introduction purposes', () => {
      expect(generateSubjectLine('INTRODUCTION')).toBe('Introduction');
      expect(generateSubjectLine('Introduce our company')).toBe('Introduction');
    });
  });

  describe('question purposes', () => {
    it('should return "Quick Question" for purposes containing "question"', () => {
      expect(generateSubjectLine('question about the report')).toBe('Quick Question');
      expect(generateSubjectLine('quick question')).toBe('Quick Question');
    });

    it('should return "Quick Question" for purposes containing "ask"', () => {
      expect(generateSubjectLine('ask about deadline')).toBe('Quick Question');
      expect(generateSubjectLine('I wanted to ask')).toBe('Quick Question');
    });

    it('should be case insensitive for question purposes', () => {
      expect(generateSubjectLine('QUESTION')).toBe('Quick Question');
      expect(generateSubjectLine('ASK something')).toBe('Quick Question');
    });
  });

  describe('thank you purposes', () => {
    it('should return "Thank You" for purposes containing "thank"', () => {
      expect(generateSubjectLine('thank you for your help')).toBe('Thank You');
      expect(generateSubjectLine('thanks for your time')).toBe('Thank You');
      expect(generateSubjectLine('thankful message')).toBe('Thank You');
    });

    it('should be case insensitive for thank you purposes', () => {
      expect(generateSubjectLine('THANK YOU')).toBe('Thank You');
      expect(generateSubjectLine('Thank you note')).toBe('Thank You');
    });
  });

  describe('project update purposes', () => {
    it('should return "Project Update" for purposes containing "update"', () => {
      expect(generateSubjectLine('update on progress')).toBe('Project Update');
      expect(generateSubjectLine('weekly update')).toBe('Project Update');
    });

    it('should return "Project Update" for purposes containing "project"', () => {
      expect(generateSubjectLine('project status')).toBe('Project Update');
      expect(generateSubjectLine('new project discussion')).toBe('Project Update');
    });

    it('should be case insensitive for project update purposes', () => {
      expect(generateSubjectLine('UPDATE')).toBe('Project Update');
      expect(generateSubjectLine('PROJECT news')).toBe('Project Update');
    });
  });

  describe('default case', () => {
    it('should return capitalized first 5 words for unrecognized purposes', () => {
      expect(generateSubjectLine('hello there')).toBe('Hello there');
      expect(generateSubjectLine('important news')).toBe('Important news');
    });

    it('should truncate long purposes to 5 words', () => {
      const longPurpose = 'this is a very long purpose that should be truncated';
      expect(generateSubjectLine(longPurpose)).toBe('This is a very long');
    });

    it('should handle exactly 5 words', () => {
      expect(generateSubjectLine('one two three four five')).toBe('One two three four five');
    });

    it('should handle less than 5 words', () => {
      expect(generateSubjectLine('one two three')).toBe('One two three');
    });

    it('should capitalize the first letter of the result', () => {
      expect(generateSubjectLine('lowercase purpose')).toBe('Lowercase purpose');
      expect(generateSubjectLine('already Capitalized')).toBe('Already Capitalized');
    });

    it('should handle single word purposes', () => {
      expect(generateSubjectLine('hello')).toBe('Hello');
      expect(generateSubjectLine('HELLO')).toBe('HELLO');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(generateSubjectLine('')).toBe('');
    });

    it('should handle purposes with special characters', () => {
      expect(generateSubjectLine('meeting!!')).toBe('Meeting Request');
      expect(generateSubjectLine('follow-up note')).toBe('Follow-up note');
    });

    it('should handle purposes with extra whitespace', () => {
      expect(generateSubjectLine('  meeting  request  ')).toBe('Meeting Request');
    });

    it('should prioritize earlier matches (meeting before update)', () => {
      // If purpose contains both "meeting" and "update", meeting should win
      expect(generateSubjectLine('meeting update')).toBe('Meeting Request');
    });
  });
});

describe('generateAlternativeSubjects', () => {
  describe('meeting alternatives', () => {
    it('should return meeting-related alternatives for purposes containing "meeting"', () => {
      const result = generateAlternativeSubjects('schedule a meeting');
      expect(result).toEqual(["Let's Connect", 'Time to Chat?', 'Scheduling a Meeting']);
    });

    it('should return meeting-related alternatives for purposes containing "schedule"', () => {
      const result = generateAlternativeSubjects('schedule a call');
      expect(result).toEqual(["Let's Connect", 'Time to Chat?', 'Scheduling a Meeting']);
    });

    it('should be case insensitive for meeting alternatives', () => {
      const result = generateAlternativeSubjects('MEETING REQUEST');
      expect(result).toEqual(["Let's Connect", 'Time to Chat?', 'Scheduling a Meeting']);
    });
  });

  describe('follow-up alternatives', () => {
    it('should return follow-up alternatives for purposes containing "follow up"', () => {
      const result = generateAlternativeSubjects('follow up on proposal');
      expect(result).toEqual(['Checking In', 'Quick Follow-up', 'Circling Back']);
    });

    it('should return follow-up alternatives for purposes containing "followup"', () => {
      const result = generateAlternativeSubjects('followup from yesterday');
      expect(result).toEqual(['Checking In', 'Quick Follow-up', 'Circling Back']);
    });

    it('should be case insensitive for follow-up alternatives', () => {
      const result = generateAlternativeSubjects('FOLLOW UP');
      expect(result).toEqual(['Checking In', 'Quick Follow-up', 'Circling Back']);
    });
  });

  describe('update/project alternatives', () => {
    it('should return update alternatives for purposes containing "update"', () => {
      const result = generateAlternativeSubjects('weekly update');
      expect(result).toEqual(['Status Update', 'Progress Report', 'Quick Update']);
    });

    it('should return update alternatives for purposes containing "project"', () => {
      const result = generateAlternativeSubjects('project status');
      expect(result).toEqual(['Status Update', 'Progress Report', 'Quick Update']);
    });

    it('should be case insensitive for update alternatives', () => {
      const result = generateAlternativeSubjects('PROJECT UPDATE');
      expect(result).toEqual(['Status Update', 'Progress Report', 'Quick Update']);
    });
  });

  describe('default alternatives', () => {
    it('should return default alternatives for unrecognized purposes', () => {
      const result = generateAlternativeSubjects('hello there');
      expect(result).toEqual(['Quick Note', 'Reaching Out', 'Brief Message']);
    });

    it('should return default alternatives for purposes not matching any category', () => {
      const result = generateAlternativeSubjects('important news about something');
      expect(result).toEqual(['Quick Note', 'Reaching Out', 'Brief Message']);
    });
  });

  describe('return value structure', () => {
    it('should always return an array', () => {
      expect(Array.isArray(generateAlternativeSubjects('meeting'))).toBe(true);
      expect(Array.isArray(generateAlternativeSubjects('follow up'))).toBe(true);
      expect(Array.isArray(generateAlternativeSubjects('update'))).toBe(true);
      expect(Array.isArray(generateAlternativeSubjects('random'))).toBe(true);
    });

    it('should always return exactly 3 items', () => {
      expect(generateAlternativeSubjects('meeting')).toHaveLength(3);
      expect(generateAlternativeSubjects('follow up')).toHaveLength(3);
      expect(generateAlternativeSubjects('update')).toHaveLength(3);
      expect(generateAlternativeSubjects('random')).toHaveLength(3);
    });

    it('should return strings for all items', () => {
      const result = generateAlternativeSubjects('meeting');
      result.forEach((item) => {
        expect(typeof item).toBe('string');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = generateAlternativeSubjects('');
      expect(result).toEqual(['Quick Note', 'Reaching Out', 'Brief Message']);
      expect(result).toHaveLength(3);
    });

    it('should handle purposes with special characters', () => {
      const result = generateAlternativeSubjects('meeting!!');
      expect(result).toEqual(["Let's Connect", 'Time to Chat?', 'Scheduling a Meeting']);
    });

    it('should prioritize meeting over update in purpose matching', () => {
      // Meeting conditions are checked first in the if-else chain
      const result = generateAlternativeSubjects('meeting update');
      expect(result).toEqual(["Let's Connect", 'Time to Chat?', 'Scheduling a Meeting']);
    });

    it('should prioritize follow-up over update in purpose matching', () => {
      // Follow-up conditions are checked before update in the if-else chain
      const result = generateAlternativeSubjects('follow up on project update');
      expect(result).toEqual(['Checking In', 'Quick Follow-up', 'Circling Back']);
    });
  });
});
