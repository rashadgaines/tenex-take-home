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

export interface ChatResponse {
  message: ChatMessage;
  suggestedActions?: ActionButton[];
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
