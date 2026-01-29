import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { generateEmailDraft } from '@/lib/ai/chat/index';
import { generateSubjectLine, generateAlternativeSubjects } from '@/lib/email/subject';
import { DraftEmailRequest, DraftEmailResponse } from '@/types/ai';
import { EmailDraft } from '@/types/email';
import {
  successResponse,
  validationErrorResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from '@/lib/api/responses';
import { validateRequired } from '@/lib/api/validation';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const body: DraftEmailRequest = await request.json();

    // Validate required fields
    const recipientValidation = validateRequired(body.recipient, 'recipient');
    if (!recipientValidation.valid) {
      return validationErrorResponse(recipientValidation.error!);
    }

    const purposeValidation = validateRequired(body.purpose, 'purpose');
    if (!purposeValidation.valid) {
      return validationErrorResponse(purposeValidation.error!);
    }

    const userName = session.user.name || 'User';

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

    return successResponse(response);
  } catch (error) {
    return internalErrorResponse('Failed to generate email draft');
  }
}
