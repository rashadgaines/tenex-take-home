/**
 * Chat module - Main entry point
 *
 * This module provides AI-powered chat functionality for scheduling,
 * email drafting, and calendar management.
 */
import OpenAI from 'openai';
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from '@/types/ai';
import { DaySchedule, CalendarEvent } from '@/types/calendar';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/types/user';
import {
  SYSTEM_PROMPT,
  buildScheduleContext,
  buildProtectedTimesContext,
  buildViewContext,
} from '../prompts';
import { calculateDayStats } from '../analytics';
import { getOpenAIClient, generateId, detectSuggestedActions } from './utils';
import { detectAndExecuteWorkflow } from './workflows';
import { detectAndHandleProtectedTimeRequest } from './protected-time';
import { detectAndHandleSchedulingRequest } from './scheduling';
import { handleConfirmation } from './confirmations';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

// Re-export public functions from submodules
export { generateBrief, generateActionItems, generateQuickInsight, getTimeBasedGreeting } from './brief';
export { generateEmailDraft, generateBatchEmailDrafts } from './email';

/**
 * Process a chat message and generate a response
 */
export async function processChat(
  request: ChatRequest,
  schedule: DaySchedule,
  preferences: UserPreferences = DEFAULT_USER_PREFERENCES,
  userId?: string,
  userName?: string
): Promise<ChatResponse> {
  const { message, context } = request;

  // Check for confirmation responses first (e.g., "yes", "send it")
  if (userId) {
    const confirmResult = await handleConfirmation(message, context, userId);
    if (confirmResult) {
      return confirmResult;
    }
  }

  // Check for multi-step workflow
  if (userId) {
    const workflowResult = await detectAndExecuteWorkflow(message, schedule, preferences, userId, userName);
    if (workflowResult) {
      return workflowResult;
    }
  }

  // Check if this is a protected time request
  const protectedTimeResult = await detectAndHandleProtectedTimeRequest(message, preferences, userId);
  if (protectedTimeResult) {
    return protectedTimeResult;
  }

  // Check if this is a scheduling request that we can handle directly
  const schedulingResult = await detectAndHandleSchedulingRequest(message, schedule, preferences, userId);
  if (schedulingResult) {
    return schedulingResult;
  }

  // Build the full context for the AI
  const scheduleContext = buildScheduleContext(schedule, preferences);
  const protectedContext = buildProtectedTimesContext(preferences);
  const viewContext = context?.currentView
    ? buildViewContext(context.currentView)
    : '';

  // Build conversation history for the API
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}

Current context:
${scheduleContext}

${protectedContext}

${viewContext}`,
    },
  ];

  // Add conversation history if provided
  if (context?.conversationHistory) {
    for (const msg of context.conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add the current user message
  messages.push({
    role: 'user',
    content: message,
  });

  // Call OpenAI API
  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages,
  });

  // Extract the text response
  const responseText = response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

  // Generate suggested actions based on the response content
  const suggestedActions = detectSuggestedActions(responseText, message);

  // Create the response message
  const responseMessage: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: responseText,
    timestamp: new Date(),
  };

  return {
    message: responseMessage,
    suggestedActions,
  };
}

/**
 * Create a mock schedule for development
 */
export function createMockSchedule(date: Date = new Date()): DaySchedule {
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  const timezone = DEFAULT_TIMEZONE;
  const events: CalendarEvent[] = [
    {
      id: '1',
      title: 'Team Standup',
      start: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
      end: new Date(baseDate.getTime() + 9.5 * 60 * 60 * 1000),
      timezone,
      attendees: [
        { email: 'colleague@example.com', name: 'Colleague', responseStatus: 'accepted' as const },
      ],
      isAllDay: false,
      category: 'meeting' as const,
      hasAgenda: true,
    },
    {
      id: '2',
      title: 'Focus Time',
      start: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000),
      end: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000),
      timezone,
      attendees: [],
      isAllDay: false,
      category: 'focus' as const,
      hasAgenda: false,
    },
    {
      id: '3',
      title: 'Client Call',
      start: new Date(baseDate.getTime() + 14 * 60 * 60 * 1000),
      end: new Date(baseDate.getTime() + 15 * 60 * 60 * 1000),
      timezone,
      attendees: [
        { email: 'client@example.com', name: 'Client', responseStatus: 'accepted' as const },
      ],
      isAllDay: false,
      category: 'external' as const,
      hasAgenda: false,
    },
  ];

  const stats = calculateDayStats(events);

  return {
    date: baseDate,
    timezone,
    events,
    availableSlots: [], // Would be calculated from preferences
    stats,
  };
}
