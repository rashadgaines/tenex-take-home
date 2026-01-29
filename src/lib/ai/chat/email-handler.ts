/**
 * Email handler for single-step email requests
 */
import { ChatResponse, ChatMessage } from '@/types/ai';
import { generateId, getOpenAIClient, cleanJsonResponse } from './utils';
import { generateEmailDraft } from './email';
import { sendEmail } from '@/lib/google/gmail';
import { generateSubjectLine } from '@/lib/email/subject';

/**
 * Detect and handle email requests
 */
export async function detectAndHandleEmailRequest(
    message: string,
    userId: string,
    userName?: string
): Promise<ChatResponse | null> {
    const lowerMessage = message.toLowerCase();

    // Check for email-related keywords
    const emailKeywords = ['email', 'send', 'draft', 'write', 'message'];
    const hasEmailKeyword = emailKeywords.some(k => lowerMessage.includes(k));

    if (!hasEmailKeyword) return null;

    try {
        // Use AI to extract email details and intent
        const extractionPrompt = `Analyze this message and extract email details.
Message: "${message}"

Return a JSON object:
{
  "isEmailRequest": boolean (true if the user is asking to draft or send a regular email),
  "intent": "send" | "draft",
  "recipients": string[] (array of email addresses or names),
  "purpose": string (brief description of the email purpose),
  "body": string (optional: specific content the user wants to include)
}

Rules:
- If the user says "email Alice", intent is "draft".
- If the user says "send an email to Alice", intent is "send".
- Only return isEmailRequest: true for regular emails, NOT for calendar invites or scheduling.`;

        const response = await getOpenAIClient().chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 400,
            temperature: 0.1,
            messages: [
                { role: 'system', content: 'Extract email intent and details as JSON only.' },
                { role: 'user', content: extractionPrompt },
            ],
        });

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) return null;

        let extraction;
        try {
            extraction = JSON.parse(cleanJsonResponse(content));
        } catch (e) {
            return null;
        }

        if (!extraction.isEmailRequest || !extraction.recipients || extraction.recipients.length === 0) {
            return null;
        }

        // Process the request
        const recipient = extraction.recipients[0]; // For now handle one
        // Try to find a real email address if it looks like one
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const emailMatch = recipient.match(emailRegex);
        const targetEmail = emailMatch ? emailMatch[0] : recipient;

        const emailBody = await generateEmailDraft({
            userName: userName || 'User',
            recipient: targetEmail,
            purpose: extraction.purpose || 'Following up',
        });

        const subject = generateSubjectLine(extraction.purpose || 'Message');

        if (extraction.intent === 'send' && emailMatch) {
            // Actually send if intent is send AND we have a valid email
            await sendEmail(userId, targetEmail, subject, emailBody);

            return {
                message: {
                    id: generateId(),
                    role: 'assistant',
                    content: ` ✓ Email sent to ${targetEmail}\n\n**Subject:** ${subject}\n\n---\n${emailBody}\n---`,
                    timestamp: new Date(),
                },
                executedActions: [
                    {
                        id: `action-email-${Date.now()}`,
                        type: 'email',
                        label: `Sent email to ${targetEmail}`,
                        status: 'completed',
                    },
                ],
            };
        } else {
            // Draft mode or no valid email found yet
            return {
                message: {
                    id: generateId(),
                    role: 'assistant',
                    content: `I've drafted that email for ${targetEmail}:\n\n**Subject:** ${subject}\n\n---\n${emailBody}\n---\n\nWould you like me to send it?`,
                    timestamp: new Date(),
                },
                suggestedActions: [
                    { label: 'Send it', action: 'open_chat', payload: { message: 'send it' } },
                    { label: 'Edit draft', action: 'edit', payload: { type: 'email', draft: { to: targetEmail, subject, body: emailBody } } },
                ],
            };
        }

    } catch (error) {
        console.error('Error handling email request:', error);
        return null;
    }
}
