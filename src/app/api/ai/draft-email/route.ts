import { NextRequest, NextResponse } from 'next/server';
import { generateEmailDraft } from '@/lib/ai/chat';
import { DraftEmailRequest, DraftEmailResponse } from '@/types/ai';
import { EmailDraft } from '@/types/email';

export async function POST(request: NextRequest) {
  try {
    const body: DraftEmailRequest = await request.json();

    // Validate required fields
    if (!body.recipient || !body.purpose) {
      return NextResponse.json(
        { error: 'Recipient and purpose are required' },
        { status: 400 }
      );
    }

    // TODO: Get user name from session
    const userName = 'User';

    // Convert suggested times if provided
    const suggestedTimes = body.suggestedTimes?.map((slot) => new Date(slot.start));

    // Generate the email draft
    const emailBody = await generateEmailDraft({
      userName,
      recipient: body.recipient,
      recipientName: body.recipientName,
      purpose: body.purpose,
      suggestedTimes,
      tone: body.tone,
    });

    // Generate a subject line based on the purpose
    const subject = generateSubjectLine(body.purpose);

    const draft: EmailDraft = {
      id: `draft-${Date.now()}`,
      to: body.recipient,
      subject,
      body: emailBody,
      suggestedTimes: body.suggestedTimes,
      status: 'draft',
      createdAt: new Date(),
    };

    const response: DraftEmailResponse = {
      draft,
      alternatives: generateAlternativeSubjects(body.purpose),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Draft email API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email draft' },
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

  // Default: use a shortened version of the purpose
  const words = purpose.split(' ').slice(0, 5).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Generate alternative subject lines
 */
function generateAlternativeSubjects(purpose: string): string[] {
  const lowerPurpose = purpose.toLowerCase();
  const alternatives: string[] = [];

  if (lowerPurpose.includes('meeting') || lowerPurpose.includes('schedule')) {
    alternatives.push(
      'Let\'s Connect',
      'Time to Chat?',
      'Scheduling a Meeting'
    );
  } else if (lowerPurpose.includes('follow up')) {
    alternatives.push(
      'Checking In',
      'Quick Follow-up',
      'Circling Back'
    );
  } else {
    alternatives.push(
      'Quick Note',
      'Reaching Out',
      'Brief Message'
    );
  }

  return alternatives;
}
