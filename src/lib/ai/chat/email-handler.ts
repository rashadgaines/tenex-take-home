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
    userName?: string,
    history?: ChatMessage[]
): Promise<ChatResponse | null> {
    const lowerMessage = message.toLowerCase();

    // Check for email-related keywords
    const emailKeywords = ['email', 'send', 'draft', 'write', 'message', 'enhance', 'edit', 'change', 'make', 'update', 'rewrite', 'shorter', 'longer', 'tell'];
    const hasEmailKeyword = emailKeywords.some(k => lowerMessage.includes(k));

    if (!hasEmailKeyword) return null;

    try {
        // Check for direct commands from the new buttons
        const isEnhanceCommand = lowerMessage.includes('enhance draft');

        // Build context from recent history (last 3 messages)
        const recentHistory = history?.slice(-3) || [];
        const historyContext = recentHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

        // Use AI to extract email details and intent
        const extractionPrompt = `Analyze this message and conversation context to extract email details.

CONTEXT:
${historyContext}

CURRENT MESSAGE: "${message}"

Return a JSON object:
{
  "isEmailRequest": boolean,
  "isEnhanceRequest": boolean (true if user specifically wants to "enhance" or "polish" a draft),
  "recipients": string[] (array of email addresses or names),
  "purpose": string (brief description of the email purpose),
  "body": string (the SPECIFIC content the user wants to include. If this is an edit request, this field MUST contain the COMPLETE, updated email body text, merging the previous draft with the new instructions.)
}

Rules:
- If user says "enhance draft", set isEnhanceRequest to true and extract the content from the LAST draft in context as the 'body'.
- If user says "Tell Alice I am late", purpose is "Being late" and body is "I am late".
- If user says "Make it more formal" (and there is a previous draft in context), 'body' should be the REWRITTEN draft, polite and formal.
- Do NOT include 'Subject:' or 'To:' headers in the 'body' field.`;

        const response = await getOpenAIClient().chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 400,
            temperature: 0.1,
            messages: [
                { role: 'system', content: 'Extract email intent as JSON only.' },
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

        if (!extraction.isEmailRequest && !extraction.isEnhanceRequest && !isEnhanceCommand) {
            return null;
        }

        // If it's an enhancement request but no body/purpose is found, we might need to look at history
        // For simplicity in this handler, we assume the AI can extract the core intent or the user is replying to a draft

        const isEnhance = extraction.isEnhanceRequest || isEnhanceCommand;

        const recipient = extraction.recipients?.[0] || 'the recipient';
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const emailMatch = recipient.match(emailRegex);
        const targetEmail = emailMatch ? emailMatch[0] : recipient;
        const hasValidEmail = !!emailMatch;

        // Determine the content to use for the draft. If this is an enhancement request
        // and no explicit body was extracted, attempt to pull the last assistant draft
        // from the conversation history (the assistant formats drafts between '---' markers).
        let contentToUse = extraction.body?.trim() || '';

        if (isEnhance && !contentToUse) {
            let lastDraftBody: string | null = null;
            if (history && history.length > 0) {
                for (let i = history.length - 1; i >= 0; i--) {
                    const m = history[i];
                    if (m.role === 'assistant' && m.content && m.content.includes('\n---\n')) {
                        const match = m.content.match(/---\n([\s\S]*?)\n---/);
                        if (match && match[1]) {
                            lastDraftBody = match[1].trim();
                            break;
                        }
                    }
                }
            }

            if (lastDraftBody) {
                contentToUse = lastDraftBody;
            } else {
                // No draft found to enhance — ask the user for the draft or more context
                return {
                    message: {
                        id: generateId(),
                        role: 'assistant',
                        content: `I can enhance a draft, but I don't see one in our recent conversation. Could you paste the draft you'd like me to enhance or point me to it?`,
                        timestamp: new Date(),
                    },
                    suggestedActions: [
                        { label: 'Paste draft', action: 'open_chat', payload: { message: 'Here is the draft:' } },
                    ],
                };
            }
        }

        const emailBody = await generateEmailDraft({
            userName: userName || 'User',
            recipient: targetEmail,
            purpose: extraction.purpose || 'Following up',
            specificContent: contentToUse,
            enhance: isEnhance,
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
            suggestedActions: [
                { label: 'Send now', action: 'open_chat', payload: { message: 'send it' }, disabled: !hasValidEmail },
                { label: 'Enhance with AI', action: 'open_chat', payload: { message: 'enhance draft' } },
                { label: 'Edit draft', action: 'edit', payload: { type: 'email', draft: { to: targetEmail, subject, body: emailBody } } },
            ],
        };

    } catch (error) {
        console.error('Error handling email request:', error);
        return null;
    }
}
