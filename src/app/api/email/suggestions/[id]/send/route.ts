import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/google/gmail';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get the suggestion
    const suggestion = await prisma.emailSuggestion.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: 'draft',
      },
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    // Send the email
    const result = await sendEmail(
      session.user.id,
      suggestion.recipient,
      suggestion.subject,
      suggestion.body
    );

    // Update the suggestion status
    await prisma.emailSuggestion.update({
      where: { id },
      data: { status: 'sent' },
    });
    
    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
