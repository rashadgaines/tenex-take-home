import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTodaySchedule } from '@/lib/google/calendar';
import { generateBrief } from '@/lib/ai/chat/index';
import type { UserPreferences } from '@/types/user';
import type { EmailSuggestion, EmailDraft } from '@/types/email';
import type { DbEmailSuggestion } from '@/types/database';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const DEFAULT_PREFERENCES: UserPreferences = {
  workingHours: { start: '09:00', end: '17:00' },
  protectedTimes: [],
  defaultMeetingDuration: 30,
  timezone: DEFAULT_TIMEZONE,
};

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user info and preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        preferences: true,
      },
    });

    const userName = user?.name?.split(' ')[0] || 'there';
    const preferences = (user?.preferences as unknown as UserPreferences) || DEFAULT_PREFERENCES;

    // Fetch real calendar data
    const schedule = await getTodaySchedule(session.user.id, preferences);

    // Fetch email suggestions from database
    const emailSuggestionsRaw = await prisma.emailSuggestion.findMany({
      where: {
        userId: session.user.id,
        status: 'draft',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Transform email suggestions to the expected type
    const emailSuggestions: EmailSuggestion[] = emailSuggestionsRaw.map((s: DbEmailSuggestion) => ({
      id: s.id,
      inReplyTo: s.inReplyTo || undefined,
      recipient: s.recipient,
      recipientName: s.recipientName || undefined,
      context: s.context,
      draft: {
        id: s.id,
        to: s.recipient,
        subject: s.subject,
        body: s.body,
        suggestedTimes: s.suggestedTimes as unknown as EmailDraft['suggestedTimes'],
        status: s.status as EmailDraft['status'],
        createdAt: s.createdAt,
      },
    }));

    // Generate the brief using AI
    const brief = await generateBrief(schedule, preferences, userName);

    // Merge email suggestions into the brief
    // Convert email suggestions to action items
    const emailActionItems = emailSuggestions.map((suggestion) => ({
      id: `email-${suggestion.id}`,
      type: 'email_reply' as const,
      title: `Reply suggested for ${suggestion.recipientName || suggestion.recipient}`,
      description: suggestion.context,
      from: suggestion.recipientName || suggestion.recipient,
      actions: [
        { label: 'Send', action: 'send_email' as const, payload: { suggestionId: suggestion.id } },
        { label: 'Edit', action: 'edit' as const, payload: { suggestionId: suggestion.id } },
        { label: 'Dismiss', action: 'dismiss' as const, payload: { suggestionId: suggestion.id } },
      ],
    }));

    // Combine generated action items with email action items
    const allActionItems = [...brief.actionItems, ...emailActionItems];

    return NextResponse.json({
      ...brief,
      actionItems: allActionItems,
      emailSuggestions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate brief' },
      { status: 500 }
    );
  }
}
