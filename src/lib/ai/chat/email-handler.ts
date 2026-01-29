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
  "recipients": string[] (array of email addresses or names),
  "purpose": string (brief description of the email purpose),
  "body": string (the SPECIFIC content the user wants to include in the email body, if any)
}

Rules:
- If user says "Tell Alice I am late", purpose is "Being late" and body is "I am late".
- Set isEmailRequest to true only for regular emails (Gmail), NOT calendar invites.`;

        const response = await getOpenAIClient().chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 400,
            temperature: 0.1,
            messages: [
                { role: 'system', content: 'Extract email intent and details as JSON only. If the user provides specific text to send, extract it into the "body" field.' },
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
        const recipient = extraction.recipients[0];
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const emailMatch = recipient.match(emailRegex);
        const targetEmail = emailMatch ? emailMatch[0] : recipient;
        const hasValidEmail = !!emailMatch;

        const emailBody = await generateEmailDraft({
            userName: userName || 'User',
            recipient: targetEmail,
            purpose: extraction.purpose || 'Following up',
            specificContent: extraction.body,
        });

        const subject = generateSubjectLine(extraction.purpose || 'Message');

        const recipientDisplay = hasValidEmail ? `**${targetEmail}**` : `**${targetEmail}** (please provide an email address)`;

        return {
            message: {
                id: generateId(),
                role: 'assistant',
                content: `I've prepared that email for ${recipientDisplay}:\n\n**To:** ${targetEmail}\n**Subject:** ${subject}\n\n---\n${emailBody}\n---\n\n${hasValidEmail ? 'Ready to send this?' : 'I need a valid email address before I can send this. Once you provide it, just say "send it".'}`,
                timestamp: new Date(),
            },
            suggestedActions: hasValidEmail ? [
                { label: 'Send now', action: 'open_chat', payload: { message: 'send it' } },
                { label: 'Edit draft', action: 'edit', payload: { type: 'email', draft: { to: targetEmail, subject, body: emailBody } } },
            ] : [
                { label: 'Edit draft', action: 'edit', payload: { type: 'email', draft: { to: targetEmail, subject, body: emailBody } } },
            ],
        };

    } catch (error) {
        console.error('Error handling email request:', error);
        return null;
    }
}
