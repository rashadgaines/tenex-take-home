import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { generateBatchEmailDrafts } from '@/lib/ai/chat/index';
import { generateSubjectLine } from '@/lib/email/subject';
import { BatchDraftEmailRequest, BatchDraftEmailResponse } from '@/types/ai';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/api/responses';
import { validateRequired, validateEmail } from '@/lib/api/validation';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const body: BatchDraftEmailRequest = await request.json();

    // Validate required fields
    const recipientsValidation = validateRequired(body.recipients, 'recipients');
    if (!recipientsValidation.valid) {
      return validationErrorResponse(recipientsValidation.error!);
    }

    if (!Array.isArray(body.recipients)) {
      return validationErrorResponse('Recipients must be an array');
    }

    const purposeValidation = validateRequired(body.purpose, 'purpose');
    if (!purposeValidation.valid) {
      return validationErrorResponse(purposeValidation.error!);
    }

    // Limit batch size to prevent abuse
    if (body.recipients.length > 10) {
      return validationErrorResponse('Maximum 10 recipients per batch');
    }

    // Validate email addresses
    for (const recipient of body.recipients) {
      if (!recipient.email) {
        return validationErrorResponse('Each recipient must have an email address');
      }
      const emailValidation = validateEmail(recipient.email);
      if (!emailValidation.valid) {
        return validationErrorResponse(emailValidation.error!);
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
      specificContent: (body as any).specificContent,
      enhance: (body as any).enhance ?? false,
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

    return successResponse(response);
  } catch (error) {
    return internalErrorResponse('Failed to generate email drafts');
  }
}
