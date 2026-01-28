import { BriefData, ActionItem, Insight, TimeAnalytics } from '@/types';
import { EmailSuggestion, EmailDraft } from '@/types';
import { mockTodaySchedule } from './calendar';

const today = new Date();

const mockEmailDraft: EmailDraft = {
  id: 'draft-1',
  to: 'dan@company.com',
  subject: 'Re: Project timeline',
  body: 'Hey Dan,\n\nI can do Thursday at 2 PM or Friday morning. Let me know what works best for you!\n\nBest,\nRashad',
  status: 'draft',
  createdAt: today,
};

export const mockEmailSuggestions: EmailSuggestion[] = [
  {
    id: 'suggestion-1',
    inReplyTo: 'email-123',
    recipient: 'dan@company.com',
    recipientName: 'Dan Rodriguez',
    context: 'Dan asked about your availability for the design review',
    draft: mockEmailDraft,
  },
];

export const mockActionItems: ActionItem[] = [
  {
    id: 'action-1',
    type: 'scheduling_request',
    title: 'Joe Chen wants to meet',
    description: 'Quick sync on the roadmap',
    from: 'Joe Chen',
    actions: [
      { label: 'Suggest times', action: 'suggest_times' },
      { label: 'Decline', action: 'decline' },
    ],
  },
  {
    id: 'action-2',
    type: 'email_reply',
    title: 'Reply suggested for Dan\'s email',
    description: '"Does Thursday 2pm or Friday morning work?"',
    from: 'Dan Rodriguez',
    actions: [
      { label: 'Send', action: 'send_email', payload: { draftId: 'draft-1' } },
      { label: 'Edit', action: 'edit', payload: { draftId: 'draft-1' } },
      { label: 'Dismiss', action: 'dismiss' },
    ],
  },
];

export const mockInsight: Insight = {
  id: 'insight-1',
  type: 'observation',
  message: 'You\'re at 58% meeting time this week, up from 45% last week. Want me to find some blocks to protect for focus time?',
  actionable: true,
  action: {
    label: 'Yes, help me',
    prompt: 'Help me find blocks to protect for focus time this week',
  },
};

export const mockBriefData: BriefData = {
  greeting: 'Good morning',
  date: today,
  summary: 'You have 3 meetings today and about 4 hours of open time. One scheduling request is waiting for your response.',
  todaySchedule: mockTodaySchedule,
  actionItems: mockActionItems,
  emailSuggestions: mockEmailSuggestions,
  insight: mockInsight,
};

export const mockTimeAnalytics: TimeAnalytics = {
  period: 'week',
  startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay()),
  endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 6),
  meetingPercent: 58,
  focusPercent: 22,
  availablePercent: 14,
  bufferPercent: 6,
  totalMeetingHours: 23,
  longestFocusBlock: 90,
  busiestDay: 'Tuesday',
  insights: [
    {
      id: 'analytics-1',
      type: 'observation',
      message: 'Your longest uninterrupted block is 90 minutes (Wednesday morning)',
      actionable: false,
    },
    {
      id: 'analytics-2',
      type: 'warning',
      message: 'Tuesday has 4 back-to-back meetings with no buffer time',
      actionable: true,
      action: {
        label: 'Add buffers',
        prompt: 'Add 15 minute buffers between my meetings on Tuesday',
      },
    },
    {
      id: 'analytics-3',
      type: 'observation',
      message: '3 of your meetings this week have no agenda attached',
      actionable: true,
      action: {
        label: 'See which ones',
        prompt: 'Which meetings this week have no agenda?',
      },
    },
  ],
};

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
