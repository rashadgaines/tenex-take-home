import type { DaySchedule, TimeSlot, CalendarEvent } from './calendar';
import type { EmailDraft, EmailSuggestion } from './email';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  type: 'time_slots' | 'email_draft' | 'analytics' | 'calendar_events';
  data: TimeSlot[] | EmailSuggestion | TimeAnalytics | CalendarEvent[];
}

export interface TimeAnalytics {
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  meetingPercent: number;
  focusPercent: number;
  availablePercent: number;
  bufferPercent: number;
  totalMeetingHours: number;
  longestFocusBlock: number;  // minutes
  busiestDay: string;
  insights: Insight[];
}

export interface Insight {
  id: string;
  type: 'observation' | 'warning' | 'suggestion';
  message: string;
  actionable: boolean;
  action?: {
    label: string;
    prompt: string;  // Pre-filled prompt for chat
  };
}

export interface BriefData {
  greeting: string;
  date: Date;
  summary: string;
  todaySchedule: DaySchedule;
  actionItems: ActionItem[];
  emailSuggestions: EmailSuggestion[];
  insight?: Insight;
}

export interface ActionItem {
  id: string;
  type: 'scheduling_request' | 'email_reply' | 'conflict' | 'reminder';
  title: string;
  description: string;
  from?: string;  // Person who initiated
  actions: ActionButton[];
}

export interface ActionButton {
  label: string;
  action: 'suggest_times' | 'decline' | 'send_email' | 'edit' | 'dismiss' | 'open_chat' | 'schedule_event';
  payload?: unknown;
}

// API Request/Response types
export interface ChatRequest {
  message: string;
  context?: ChatContext;
}

export interface ChatContext {
  currentView?: 'brief' | 'plan' | 'time' | 'calendar';
  selectedDate?: Date;
  conversationHistory?: ChatMessage[];
}

export interface ExecutedAction {
  id: string;
  type: 'schedule' | 'email' | 'update' | 'analyze';
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  suggestedActions?: ActionButton[];
  executedActions?: ExecutedAction[];
}

export interface AnalyticsRequest {
  period: 'day' | 'week' | 'month';
  startDate?: string;
}

export interface DraftEmailRequest {
  recipient: string;
  recipientName?: string;
  purpose: string;
  suggestedTimes?: TimeSlot[];
  tone?: 'formal' | 'casual' | 'neutral';
}

export interface DraftEmailResponse {
  draft: EmailDraft;
  alternatives?: string[];
}

// Multi-meeting scheduling types
export interface ExtractedMeeting {
  title: string;
  duration: number;
  date: string | null;
  time: string | null;
  attendees: string[];
  description: string;
  location: string;
}

export interface BatchScheduleResult {
  created: Array<{
    title: string;
    start: Date;
    end: Date;
    attendees: string[];
  }>;
  failed: Array<{
    title: string;
    error: string;
  }>;
}

// Batch email drafting types
export interface BatchDraftEmailRequest {
  recipients: Array<{
    email: string;
    name?: string;
  }>;
  purpose: string;
  suggestedTimes?: TimeSlot[];
  tone?: 'formal' | 'casual' | 'neutral';
}

export interface BatchDraftEmailResponse {
  drafts: Array<{
    id: string;
    to: string;
    toName?: string;
    subject: string;
    body: string;
  }>;
  failed: Array<{
    email: string;
    error: string;
  }>;
}

// Actionable recommendations
export interface Recommendation {
  id: string;
  type: 'schedule_focus_time' | 'add_buffer' | 'batch_meetings' | 'decline_meeting' | 'reschedule';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: {
    type: string;
    payload: Record<string, unknown>;
    prompt: string;
  };
}

export interface ActionableAnalytics extends TimeAnalytics {
  recommendations: Recommendation[];
}

// Workflow orchestration types
export interface WorkflowStep {
  id: string;
  type: 'schedule' | 'email' | 'update_preferences' | 'analyze';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  description: string;
  result?: unknown;
  error?: string;
}

export interface Workflow {
  id: string;
  steps: WorkflowStep[];
  currentStep: number;
  status: 'running' | 'completed' | 'failed';
  summary?: string;
}

export interface WorkflowChatResponse extends ChatResponse {
  workflow?: Workflow;
}

export interface WorkflowPlan {
  isMultiStep: boolean;
  steps: Array<{
    type: 'schedule' | 'email' | 'update_preferences' | 'analyze';
    description: string;
    params: Record<string, unknown>;
  }>;
}
