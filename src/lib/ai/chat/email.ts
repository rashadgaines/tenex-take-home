/**
 * Email generation functionality
 */
import { SYSTEM_PROMPT, buildEmailDraftPrompt } from '../prompts';
import { getOpenAIClient } from './utils';

/**
 * Generate an email draft
 */
export async function generateEmailDraft(params: {
  userName: string;
  recipient: string;
  recipientName?: string;
  purpose: string;
  suggestedTimes?: Date[];
  tone?: 'formal' | 'casual' | 'neutral';
  specificContent?: string;
}): Promise<string> {
  const timesFormatted = params.suggestedTimes?.map((t) =>
    t.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  );

  const prompt = buildEmailDraftPrompt({
    userName: params.userName,
    recipient: params.recipient,
    recipientName: params.recipientName,
    purpose: params.purpose,
    suggestedTimes: timesFormatted,
    tone: params.tone,
    specificContent: params.specificContent,
  });

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Generate batch email drafts for multiple recipients
 */
export async function generateBatchEmailDrafts(params: {
  userName: string;
  recipients: Array<{ email: string; name?: string }>;
  purpose: string;
  suggestedTimes?: Date[];
  tone?: 'formal' | 'casual' | 'neutral';
  specificContent?: string;
}): Promise<{
  drafts: Array<{ email: string; name?: string; body: string }>;
  failed: Array<{ email: string; error: string }>;
}> {
  const results = await Promise.all(
    params.recipients.map(async (recipient) => {
      try {
        const body = await generateEmailDraft({
          userName: params.userName,
          recipient: recipient.email,
          recipientName: recipient.name,
          purpose: params.purpose,
          suggestedTimes: params.suggestedTimes,
          tone: params.tone,
          specificContent: params.specificContent,
        });
        return {
          success: true as const,
          email: recipient.email,
          name: recipient.name,
          body,
        };
      } catch (error) {
        return {
          success: false as const,
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Failed to generate draft',
        };
      }
    })
  );

  const drafts: Array<{ email: string; name?: string; body: string }> = [];
  const failed: Array<{ email: string; error: string }> = [];

  for (const result of results) {
    if (result.success) {
      drafts.push({
        email: result.email,
        name: result.name,
        body: result.body,
      });
    } else {
      failed.push({
        email: result.email,
        error: result.error,
      });
    }
  }

  return { drafts, failed };
}
