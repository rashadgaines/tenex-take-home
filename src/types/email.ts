import type { TimeSlot } from './calendar';

export interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  suggestedTimes?: TimeSlot[];
  status: 'draft' | 'sent' | 'dismissed';
  createdAt: Date;
}

export interface EmailSuggestion {
  id: string;
  inReplyTo?: string;  // Original email ID if it's a reply
  recipient: string;
  recipientName?: string;
  context: string;     // Why this suggestion was generated
  draft: EmailDraft;
}
