import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { EmailSuggestion, EmailDraft } from '@/types/email';
import type { DbEmailSuggestion } from '@/types/database';

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const suggestions = await prisma.emailSuggestion.findMany({
      where: {
        userId: session.user.id,
        status: 'draft',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to the EmailSuggestion type expected by frontend
    const transformed: EmailSuggestion[] = suggestions.map((s: DbEmailSuggestion) => ({
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
    
    return NextResponse.json(transformed);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch email suggestions' },
      { status: 500 }
    );
  }
}
