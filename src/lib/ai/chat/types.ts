/**
 * Local types for the chat module
 */

/**
 * Extracted meeting data from AI parsing
 */
export interface ExtractedMeetingData {
  title: string;
  duration?: number;
  date?: string | null;
  time?: string | null;
  attendees?: string[];
  description?: string;
  location?: string;
}

/**
 * Result of creating multiple meetings
 */
export interface CreateMeetingsResult {
  created: Array<{ title: string; start: Date; end: Date; attendees: string[] }>;
  failed: Array<{ title: string; error: string }>;
}

/**
 * Workflow plan from AI analysis
 */
export interface WorkflowPlanStep {
  type: 'schedule' | 'email' | 'update_preferences' | 'analyze';
  description: string;
  params: Record<string, unknown>;
}

/**
 * Extracted protected time details
 */
export interface ProtectedTimeDetails {
  label?: string;
  start: string;
  end: string;
  days: number[];
}
