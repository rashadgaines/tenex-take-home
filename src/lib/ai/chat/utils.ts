/**
 * Shared utilities for the chat module
 */
import OpenAI from 'openai';
import { ActionButton } from '@/types/ai';

// Lazy initialization of OpenAI client (singleton)
let openaiClient: OpenAI | null = null;

/**
 * Get the OpenAI client instance (singleton pattern)
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect potential suggested actions based on message content
 */
export function detectSuggestedActions(response: string, userMessage: string): ActionButton[] {
  const actions: ActionButton[] = [];
  const lowerResponse = response.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();

  // If discussing scheduling
  if (
    lowerMessage.includes('schedule') ||
    lowerMessage.includes('meeting') ||
    lowerMessage.includes('time')
  ) {
    if (lowerResponse.includes('available') || lowerResponse.includes('free')) {
      actions.push({
        label: 'Suggest times',
        action: 'suggest_times',
      });
    }
  }

  // If discussing emails
  if (lowerMessage.includes('email') || lowerMessage.includes('send')) {
    actions.push({
      label: 'Draft email',
      action: 'send_email',
    });
  }

  // If the response mentions editing or changing
  if (lowerResponse.includes('edit') || lowerResponse.includes('change')) {
    actions.push({
      label: 'Edit',
      action: 'edit',
    });
  }

  return actions.slice(0, 3); // Limit to 3 actions
}

/**
 * Get tomorrow's date as YYYY-MM-DD
 */
export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Clean JSON text from AI response (remove markdown code blocks, etc.)
 */
export function cleanJsonResponse(text: string): string {
  return text
    .replace(/```json\s*/i, '')
    .replace(/```\s*$/, '')
    .replace(/^[^{]*/, '')
    .replace(/[^}]*$/, '')
    .trim();
}
