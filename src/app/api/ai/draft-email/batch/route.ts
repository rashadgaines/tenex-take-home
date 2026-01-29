import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateBatchEmailDrafts } from '@/lib/ai/chat';
import { BatchDraftEmailRequest, BatchDraftEmailResponse } from '@/types/ai';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: BatchDraftEmailRequest = await request.json();

    // Validate required fields
    if (!body.recipients || !Array.isArray(body.recipients) || body.recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!body.purpose) {
      return NextResponse.json(
        { error: 'Purpose is required' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (body.recipients.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 recipients per batch' },
        { status: 400 }
      );
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const recipient of body.recipients) {
      if (!recipient.email || !emailRegex.test(recipient.email)) {
        return NextResponse.json(
          { error: `Invalid email address: ${recipient.email || 'empty'}` },
          { status: 400 }
        );
      }
    }

    const userName = session.user.name || 'User';

    // Convert suggested times if provided
    const suggestedTimes = body.suggestedTimes?.map((slot) => new Date(slot.start));

    // Generate batch email drafts
    const { drafts, failed } = await generateBatchEmailDrafts({
      userName,
      recipients: body.recipients,
      purpose: body.purpose,
      suggestedTimes,
      tone: body.tone,
    });

    // Generate subject line
    const subject = generateSubjectLine(body.purpose);

    // Build response
    const response: BatchDraftEmailResponse = {
      drafts: drafts.map((draft, index) => ({
        id: `draft-${Date.now()}-${index}`,
        to: draft.email,
        toName: draft.name,
        subject,
        body: draft.body,
      })),
      failed,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Batch draft email API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email drafts' },
      { status: 500 }
    );
  }
}

/**
 * Generate a subject line based on the email purpose
 */
function generateSubjectLine(purpose: string): string {
  const lowerPurpose = purpose.toLowerCase();

  if (lowerPurpose.includes('meeting') || lowerPurpose.includes('schedule')) {
    return 'Meeting Request';
  }

  if (lowerPurpose.includes('follow up') || lowerPurpose.includes('followup')) {
    return 'Following Up';
  }

  if (lowerPurpose.includes('introduction') || lowerPurpose.includes('introduce')) {
    return 'Introduction';
  }

  if (lowerPurpose.includes('question') || lowerPurpose.includes('ask')) {
    return 'Quick Question';
  }

  if (lowerPurpose.includes('thank')) {
    return 'Thank You';
  }

  if (lowerPurpose.includes('update') || lowerPurpose.includes('project')) {
    return 'Project Update';
  }

  // Default: use a shortened version of the purpose
  const words = purpose.split(' ').slice(0, 5).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
