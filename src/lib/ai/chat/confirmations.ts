/**
 * Confirmation handling for pending actions
 */
import { ChatResponse, ChatMessage, ChatContext } from '@/types/ai';
import { generateId } from './utils';
import { sendEmail } from '@/lib/google/gmail';

/**
 * Check if a message is a confirmation
 */
export function isConfirmation(message: string): boolean {
  const confirmPatterns = [
    /^(yes|yeah|yep|yup|sure|ok|okay|go ahead|do it|send it|looks good|perfect|great|sounds good|please|absolutely|definitely|confirmed?)\.?$/i,
    /^(yes|yeah|yep),?\s+(please|send|do it|go ahead)/i,
    /^send\s*(it|the email|that)?\.?$/i,
    /^(that|this)\s*(looks|sounds)\s*(good|great|perfect)/i,
    /^(go|proceed|continue|confirm)/i,
  ];

  const trimmed = message.trim();
  return confirmPatterns.some(p => p.test(trimmed));
}

/**
 * Detect what action was proposed in the conversation
 */
export function detectPendingAction(
  conversationHistory: ChatMessage[]
): { type: 'send_email'; data: { to: string; subject: string; body: string } } | null {
  // Look at the last assistant messages to find proposed actions
  const lastAssistantMessages = conversationHistory
    .filter(m => m.role === 'assistant')
    .slice(-3);

  for (const msg of lastAssistantMessages.reverse()) {
    const content = msg.content.toLowerCase();

    // Check for email draft
    if (
      content.includes('draft') ||
      content.includes('email') ||
      content.includes('subject:') ||
      content.includes('here\'s')
    ) {
      // Try to extract email details from the message
      const emailData = extractEmailFromMessage(msg.content);
      if (emailData) {
        return { type: 'send_email', data: emailData };
      }
    }
  }

  return null;
}

/**
 * Extract email details from a message containing a draft
 */
function extractEmailFromMessage(
  content: string
): { to: string; subject: string; body: string } | null {
  // Look for email patterns
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = content.match(emailRegex);
  const to = emails?.[0];

  if (!to) return null;

  // Try to extract subject
  const subjectMatch = content.match(/subject:\s*([^\n]+)/i);
  const subject = subjectMatch?.[1]?.trim() || 'Meeting Request';

  // Try to extract body - look for content between "---" markers or after "Hi"
  let body = '';
  const dashMatch = content.match(/---\s*([\s\S]*?)\s*---/);
  if (dashMatch) {
    body = dashMatch[1].trim();
  } else {
    // Look for email body starting with common greetings
    const greetingMatch = content.match(/((?:hi|hello|dear|hey)\s+[^\n]*[\s\S]*(?:regards|best|thanks|sincerely)[,\s]*[^\n]*)/i);
    if (greetingMatch) {
      body = greetingMatch[1].trim();
    }
  }

  if (!body) return null;

  return { to, subject, body };
}

/**
 * Handle a confirmation and execute the pending action
 */
export async function handleConfirmation(
  message: string,
  context: ChatContext | undefined,
  userId: string
): Promise<ChatResponse | null> {
  if (!isConfirmation(message) || !context?.conversationHistory) {
    return null;
  }

  const pendingAction = detectPendingAction(context.conversationHistory);

  if (!pendingAction) {
    return null;
  }

  try {
    switch (pendingAction.type) {
      case 'send_email': {
        const { to, subject, body } = pendingAction.data;

        // Actually send the email
        await sendEmail(userId, to, subject, body);

        const responseMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `  ✓ Email sent to ${to}\n\n**Done!** The email has been sent successfully.`,
          timestamp: new Date(),
        };

        return {
          message: responseMessage,
          suggestedActions: [],
          executedActions: [
            {
              id: `action-email-${Date.now()}`,
              type: 'email',
              label: `Sent email to ${to}`,
              status: 'completed',
            },
          ],
        };
      }

      default:
        return null;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const responseMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `  ✗ Failed to complete action\n\nSorry, there was an error: ${errorMessage}`,
      timestamp: new Date(),
    };

    return {
      message: responseMessage,
      suggestedActions: [],
      executedActions: [
        {
          id: `action-failed-${Date.now()}`,
          type: 'email',
          label: 'Failed to send email',
          status: 'failed',
          detail: errorMessage,
        },
      ],
    };
  }
}
