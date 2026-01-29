import OpenAI from 'openai';
import { createDateFromStrings, isInPast } from '../date-utils';
import { getUserTimezone, getUserPreferences, updateUserPreferences } from '../user-preferences';
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatContext,
  ActionButton,
  BriefData,
  Insight,
  ActionItem,
  WorkflowPlan,
  Workflow,
  WorkflowStep,
  WorkflowChatResponse,
} from '@/types/ai';
import { DaySchedule, CalendarEvent } from '@/types/calendar';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/types/user';
import { EmailSuggestion } from '@/types/email';
import {
  SYSTEM_PROMPT,
  buildScheduleContext,
  buildProtectedTimesContext,
  buildViewContext,
  buildBriefPrompt,
  buildEmailDraftPrompt,
} from './prompts';
import { calculateTimeAnalytics, calculateAvailableSlots, calculateDayStats } from './analytics';
import { createEvent } from '@/lib/google/calendar';

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
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
 * Process a chat message and generate a response
 */
export async function processChat(
  request: ChatRequest,
  schedule: DaySchedule,
  preferences: UserPreferences = DEFAULT_USER_PREFERENCES,
  userId?: string
): Promise<ChatResponse> {
  const { message, context } = request;

  // Check for multi-step workflow first
  if (userId) {
    const workflowResult = await detectAndExecuteWorkflow(message, schedule, preferences, userId);
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
 * Generate a daily brief
 */
export async function generateBrief(
  schedule: DaySchedule,
  preferences: UserPreferences,
  userName: string
): Promise<BriefData> {
  const prompt = buildBriefPrompt({ userName, schedule, preferences });

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  const briefText = response.choices[0]?.message?.content || '';

  // Parse the brief response
  const lines = briefText.split('\n').filter((l) => l.trim());
  const greeting = lines[0] || getTimeBasedGreeting();
  const summary = lines.slice(1).join(' ') || 'Your calendar is ready for review.';

  // Generate action items from schedule
  const actionItems = generateActionItems(schedule);

  // Generate insight
  const insight = generateQuickInsight(schedule);

  return {
    greeting,
    date: new Date(),
    summary,
    todaySchedule: schedule,
    actionItems,
    emailSuggestions: [], // This would be populated from actual email data
    insight,
  };
}

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

/**
 * Detect multi-step workflow requests and execute them
 */
async function detectAndExecuteWorkflow(
  message: string,
  schedule: DaySchedule,
  preferences: UserPreferences,
  userId: string
): Promise<WorkflowChatResponse | null> {
  // Quick check for potential multi-step requests
  const multiStepIndicators = [
    /\b(and|then|also|after that)\b.*\b(schedule|email|block|send|draft|protect)\b/i,
    /\b(schedule|email|send).+(and|then).+(email|schedule|send)\b/i,
    /\bfor each\b.*(email|send|draft)/i,
    /\b(them|each|everyone|all)\b.*(email|send|draft)/i,
  ];

  const mightBeMultiStep = multiStepIndicators.some(pattern => pattern.test(message));
  if (!mightBeMultiStep) {
    return null;
  }

  try {
    // Use AI to analyze if this is a multi-step workflow
    const analysisPrompt = `Analyze if this request requires multiple distinct steps to complete.

Message: "${message}"

Return a JSON object:
{
  "isMultiStep": boolean (true only if request explicitly requires 2+ DIFFERENT actions),
  "steps": [
    {
      "type": "schedule" | "email" | "update_preferences" | "analyze",
      "description": "brief description of this step",
      "params": { ... relevant parameters }
    }
  ]
}

Rules:
- "schedule meetings with 3 people" = NOT multi-step (one action: scheduling)
- "schedule a meeting AND email them" = multi-step (2 actions: schedule + email)
- "block my mornings and schedule a meeting" = multi-step (2 actions: preferences + schedule)
- Only return isMultiStep: true if there are genuinely different action types

Examples:
"Schedule a meeting with Alice tomorrow and send her a confirmation email"
{"isMultiStep":true,"steps":[{"type":"schedule","description":"Schedule meeting with Alice tomorrow","params":{"attendees":["alice"],"date":"tomorrow"}},{"type":"email","description":"Send confirmation email to Alice","params":{"recipients":["alice"],"purpose":"meeting confirmation"}}]}

"Schedule meetings with Joe, Dan, and Sally next week"
{"isMultiStep":false,"steps":[{"type":"schedule","description":"Schedule multiple meetings","params":{}}]}`;

    const analysisResponse = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'Analyze requests for multi-step workflows. Return JSON only.' },
        { role: 'user', content: analysisPrompt },
      ],
    });

    const analysisText = analysisResponse.choices[0]?.message?.content?.trim();
    if (!analysisText) {
      return null;
    }

    let workflowPlan: WorkflowPlan;
    try {
      const cleanText = analysisText
        .replace(/```json\s*/i, '')
        .replace(/```\s*$/, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      workflowPlan = JSON.parse(cleanText);
    } catch {
      return null;
    }

    // Only proceed if genuinely multi-step
    if (!workflowPlan.isMultiStep || !Array.isArray(workflowPlan.steps) || workflowPlan.steps.length < 2) {
      return null;
    }

    // Execute the workflow
    return await executeWorkflow(workflowPlan, message, schedule, preferences, userId);

  } catch (error) {
    console.error('Workflow detection error:', error);
    return null;
  }
}

/**
 * Execute a multi-step workflow
 */
async function executeWorkflow(
  plan: WorkflowPlan,
  originalMessage: string,
  schedule: DaySchedule,
  preferences: UserPreferences,
  userId: string
): Promise<WorkflowChatResponse> {
  const workflow: Workflow = {
    id: generateId(),
    steps: plan.steps.map((step, i) => ({
      id: `step-${i}`,
      type: step.type,
      status: 'pending' as const,
      description: step.description,
    })),
    currentStep: 0,
    status: 'running',
  };

  const results: string[] = [];
  const userTimezone = await getUserTimezone(userId);

  for (let i = 0; i < plan.steps.length; i++) {
    workflow.steps[i].status = 'in_progress';
    workflow.currentStep = i;
    const step = plan.steps[i];

    try {
      switch (step.type) {
        case 'schedule': {
          // Use the scheduling handler
          const scheduleResult = await detectAndHandleSchedulingRequest(
            originalMessage,
            schedule,
            preferences,
            userId
          );
          if (scheduleResult) {
            workflow.steps[i].result = scheduleResult.message.content;
            results.push(`Scheduling: ${scheduleResult.message.content}`);
          } else {
            throw new Error('Failed to process scheduling request');
          }
          break;
        }

        case 'email': {
          // Extract email recipients from params or original message
          const recipients = extractRecipientsFromMessage(originalMessage, step.params);
          if (recipients.length > 0) {
            const { drafts, failed } = await generateBatchEmailDrafts({
              userName: 'User', // TODO: get from session
              recipients,
              purpose: step.description || 'follow up',
              tone: 'neutral',
            });

            if (drafts.length > 0) {
              workflow.steps[i].result = { drafts, failed };
              results.push(`Email drafts: Created ${drafts.length} draft(s) for ${recipients.map(r => r.name || r.email).join(', ')}`);
            } else {
              throw new Error('Failed to generate email drafts');
            }
          } else {
            results.push(`Email drafts: Ready to send (recipients to be specified)`);
          }
          break;
        }

        case 'update_preferences': {
          // Use the protected time handler
          const prefResult = await detectAndHandleProtectedTimeRequest(
            originalMessage,
            preferences,
            userId
          );
          if (prefResult) {
            workflow.steps[i].result = prefResult.message.content;
            results.push(`Preferences: ${prefResult.message.content}`);
          } else {
            results.push(`Preferences: Noted for your settings`);
          }
          break;
        }

        case 'analyze': {
          results.push(`Analysis: ${step.description}`);
          break;
        }
      }

      workflow.steps[i].status = 'completed';

    } catch (error) {
      console.error(`Workflow step ${i} failed:`, error);
      workflow.steps[i].status = 'failed';
      workflow.steps[i].error = error instanceof Error ? error.message : 'Step failed';
      results.push(`${step.description}: Failed`);
    }
  }

  workflow.status = workflow.steps.every(s => s.status === 'completed')
    ? 'completed'
    : 'failed';
  workflow.summary = results.join('\n');

  const responseMessage: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: `I've completed your request:\n\n${results.join('\n\n')}\n\nLet me know if you need anything else!`,
    timestamp: new Date(),
  };

  return {
    message: responseMessage,
    suggestedActions: [],
    workflow,
  };
}

/**
 * Extract recipient information from message and params
 */
function extractRecipientsFromMessage(
  message: string,
  params: Record<string, unknown>
): Array<{ email: string; name?: string }> {
  const recipients: Array<{ email: string; name?: string }> = [];

  // Check params first
  if (params.recipients && Array.isArray(params.recipients)) {
    for (const r of params.recipients) {
      if (typeof r === 'string') {
        // Could be email or name
        if (r.includes('@')) {
          recipients.push({ email: r });
        } else {
          recipients.push({ email: '', name: r });
        }
      } else if (typeof r === 'object' && r !== null && 'email' in r) {
        recipients.push(r as { email: string; name?: string });
      }
    }
  }

  // Extract emails from message
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const foundEmails = message.match(emailRegex) || [];
  for (const email of foundEmails) {
    if (!recipients.some(r => r.email === email)) {
      recipients.push({ email });
    }
  }

  return recipients;
}

/**
 * Detect and handle protected time requests
 */
async function detectAndHandleProtectedTimeRequest(
  message: string,
  preferences: UserPreferences,
  userId?: string
): Promise<ChatResponse | null> {
  // Check for protected time patterns
  const protectedTimePatterns = [
    /block.*(?:my|the)?\s*(?:mornings?|afternoons?|evenings?|lunch|time)/i,
    /protect.*(?:my|the)?\s*(?:mornings?|afternoons?|evenings?|time)/i,
    /don't.*schedule.*(?:during|before|after)/i,
    /keep.*(?:free|open|clear)/i,
    /add.*protected\s*time/i,
    /reserve.*time.*for/i,
    /block.*(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
  ];

  const isProtectedTimeRequest = protectedTimePatterns.some(pattern => pattern.test(message));

  if (!isProtectedTimeRequest || !userId) {
    return null;
  }

  try {
    // Use AI to extract protected time details
    const extractionPrompt = `Extract protected time block details from this request. Return ONLY a valid JSON object with these fields:
- label: string (descriptive name like "Morning workout", "Lunch break", "Focus time")
- start: string (HH:MM format in 24-hour time, e.g., "06:00" for 6 AM)
- end: string (HH:MM format in 24-hour time, e.g., "09:00" for 9 AM)
- days: number[] (array where 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)

Common patterns:
- "mornings" typically means 06:00-09:00
- "lunch" typically means 12:00-13:00
- "afternoons" typically means 13:00-17:00
- "weekdays" = [1,2,3,4,5]
- "weekends" = [0,6]
- "every day" = [0,1,2,3,4,5,6]

Examples:
Input: "Block my mornings for workouts on weekdays"
Output: {"label":"Morning workout","start":"06:00","end":"09:00","days":[1,2,3,4,5]}

Input: "Keep 12-1pm free for lunch Monday through Friday"
Output: {"label":"Lunch break","start":"12:00","end":"13:00","days":[1,2,3,4,5]}

Input: "Don't schedule meetings before 10am"
Output: {"label":"Morning blocked","start":"06:00","end":"10:00","days":[1,2,3,4,5]}

Message: "${message}"`;

    const extractionResponse = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 200,
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'Extract protected time details as valid JSON only. Be precise with times and days.' },
        { role: 'user', content: extractionPrompt },
      ],
    });

    const extractionText = extractionResponse.choices[0]?.message?.content?.trim();

    if (!extractionText) {
      throw new Error('No response from AI extraction');
    }

    let protectedTimeDetails;
    try {
      const cleanText = extractionText
        .replace(/```json\s*/i, '')
        .replace(/```\s*$/, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();

      protectedTimeDetails = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Failed to parse protected time extraction:', extractionText, parseError);
      return null; // Fall back to normal AI response
    }

    // Validate extracted data
    if (!protectedTimeDetails.start || !protectedTimeDetails.end || !Array.isArray(protectedTimeDetails.days)) {
      return null;
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(protectedTimeDetails.start) || !timeRegex.test(protectedTimeDetails.end)) {
      return null;
    }

    // Validate days
    if (!protectedTimeDetails.days.every((d: number) => d >= 0 && d <= 6)) {
      return null;
    }

    // Create the new protected time
    const newProtectedTime = {
      label: protectedTimeDetails.label || 'Protected Time',
      start: protectedTimeDetails.start,
      end: protectedTimeDetails.end,
      days: protectedTimeDetails.days,
    };

    // Get current preferences and add the new protected time
    const currentPrefs = await getUserPreferences(userId);
    const updatedProtectedTimes = [...currentPrefs.protectedTimes, newProtectedTime];

    // Save the updated preferences
    await updateUserPreferences(userId, { protectedTimes: updatedProtectedTimes });

    // Format days for display
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysDisplay = protectedTimeDetails.days.length === 7
      ? 'every day'
      : protectedTimeDetails.days.length === 5 && protectedTimeDetails.days.every((d: number) => d >= 1 && d <= 5)
        ? 'weekdays'
        : protectedTimeDetails.days.map((d: number) => dayNames[d]).join(', ');

    // Format times for display
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const responseMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `I've added "${newProtectedTime.label}" to your protected times. This blocks ${formatTime(newProtectedTime.start)} - ${formatTime(newProtectedTime.end)} on ${daysDisplay}. Meetings won't be scheduled during this time.`,
      timestamp: new Date(),
    };

    return {
      message: responseMessage,
      suggestedActions: [
        { label: 'View settings', action: 'open_chat', payload: { redirect: '/settings' } },
      ],
    };

  } catch (error) {
    console.error('Failed to create protected time:', error);
    return null; // Fall back to normal AI response
  }
}

/**
 * Detect and handle scheduling requests by actually creating events
 * Supports both single meeting and multi-meeting requests
 */
async function detectAndHandleSchedulingRequest(
  message: string,
  schedule: DaySchedule,
  preferences: UserPreferences,
  userId?: string
): Promise<ChatResponse | null> {
  const lowerMessage = message.toLowerCase();

  // Check for scheduling patterns (more comprehensive)
  const schedulingPatterns = [
    /schedule.*meeting/i,
    /set up.*meeting/i,
    /create.*meeting/i,
    /book.*meeting/i,
    /schedule.*call/i,
    /set up.*call/i,
    /add.*event/i,
    /create.*event/i,
    /block.*time/i,
    /schedule.*appointment/i,
    /book.*appointment/i,
    /plan.*meeting/i,
    /organize.*meeting/i,
  ];

  const isSchedulingRequest = schedulingPatterns.some(pattern => pattern.test(lowerMessage));

  if (!isSchedulingRequest || !userId) {
    return null;
  }

  try {
    // Use AI to extract event details - supports multiple meetings
    const extractionPrompt = `Extract event details from this scheduling request. The user may be requesting ONE or MULTIPLE meetings.

Return a JSON object with:
- isBatch: boolean (true if multiple distinct meetings are requested, false for single meeting)
- meetings: array of meeting objects, each with:
  - title: string (brief, descriptive title, max 100 chars)
  - duration: number (minutes: 15, 30, 60, 90, 120, etc.)
  - date: string (YYYY-MM-DD format, or null if not specified)
  - time: string (HH:MM 24-hour format, or null if not specified)
  - attendees: string[] (valid email addresses only, or empty array)
  - description: string (details, or empty string)
  - location: string (location if mentioned, or empty string)

IMPORTANT:
- If user mentions multiple people with different times/dates, create SEPARATE meetings for each
- "meetings with Joe, Dan, and Sally" = 3 separate meetings (isBatch: true)
- "team meeting with Joe, Dan, Sally" = 1 meeting with all as attendees (isBatch: false)
- Only include valid email addresses in attendees array
- Duration should be 15-480 minutes

Examples:
Input: "Schedule meetings with alice@test.com tomorrow at 2pm and bob@test.com on Friday at 10am"
Output: {"isBatch":true,"meetings":[{"title":"Meeting with Alice","duration":30,"date":"2024-01-30","time":"14:00","attendees":["alice@test.com"],"description":"","location":""},{"title":"Meeting with Bob","duration":30,"date":"2024-02-02","time":"10:00","attendees":["bob@test.com"],"description":"","location":""}]}

Input: "Set up a team meeting with alice@test.com and bob@test.com Monday at 2pm"
Output: {"isBatch":false,"meetings":[{"title":"Team Meeting","duration":30,"date":"2024-01-29","time":"14:00","attendees":["alice@test.com","bob@test.com"],"description":"","location":""}]}

Input: "I need to schedule three meetings with Joe, Dan, and Sally next week"
Output: {"isBatch":true,"meetings":[{"title":"Meeting with Joe","duration":30,"date":null,"time":null,"attendees":[],"description":"","location":""},{"title":"Meeting with Dan","duration":30,"date":null,"time":null,"attendees":[],"description":"","location":""},{"title":"Meeting with Sally","duration":30,"date":null,"time":null,"attendees":[],"description":"","location":""}]}

Message: "${message}"

Current date: ${new Date().toISOString().split('T')[0]}
Working hours: ${preferences.workingHours.start} - ${preferences.workingHours.end}`;

    const extractionResponse = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'Extract event details as valid JSON only. Support both single and multiple meeting requests. Be precise with dates, times, and emails.' },
        { role: 'user', content: extractionPrompt },
      ],
    });

    const extractionText = extractionResponse.choices[0]?.message?.content?.trim();

    if (!extractionText) {
      throw new Error('No response from AI extraction');
    }

    let extractedData;
    try {
      const cleanText = extractionText
        .replace(/```json\s*/i, '')
        .replace(/```\s*$/, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();

      extractedData = JSON.parse(cleanText);

      if (typeof extractedData !== 'object' || extractedData === null) {
        throw new Error('Invalid response structure');
      }

      // Ensure meetings array exists
      if (!Array.isArray(extractedData.meetings) || extractedData.meetings.length === 0) {
        throw new Error('No meetings extracted');
      }

    } catch (parseError) {
      console.error('Failed to parse AI extraction response:', extractionText, parseError);

      // Fallback: create a basic single event
      const titleMatch = message.match(/(?:schedule|set up|create|book|add)\s+(.+?)(?:\s+(?:for|at|on|tomorrow|today|next|this)|\s*$)/i);
      const title = titleMatch ? titleMatch[1].trim() : (message.length > 50 ? message.substring(0, 47) + '...' : message);

      extractedData = {
        isBatch: false,
        meetings: [{
          title: title.substring(0, 100),
          duration: 30,
          date: null,
          time: null,
          attendees: [],
          description: '',
          location: '',
        }],
      };
    }

    const userTimezone = await getUserTimezone(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Process all meetings
    const results = await createMultipleMeetings(
      extractedData.meetings,
      userId,
      preferences,
      userTimezone,
      message,
      today,
      tomorrow
    );

    // Build response message
    let responseContent: string;
    if (results.created.length === 0) {
      throw new Error('Failed to create any meetings');
    } else if (results.created.length === 1) {
      const meeting = results.created[0];
      responseContent = `I've scheduled "${meeting.title}" for ${meeting.start.toLocaleDateString('en-US', { timeZone: userTimezone })} at ${meeting.start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: userTimezone
      })} - ${meeting.end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: userTimezone
      })}.${meeting.attendees.length > 0 ? ` Invitations sent to ${meeting.attendees.length} attendee(s).` : ''}`;
    } else {
      const meetingList = results.created.map(m =>
        `- "${m.title}" on ${m.start.toLocaleDateString('en-US', { timeZone: userTimezone, weekday: 'short', month: 'short', day: 'numeric' })} at ${m.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: userTimezone })}`
      ).join('\n');
      responseContent = `I've scheduled ${results.created.length} meetings:\n\n${meetingList}`;

      if (results.failed.length > 0) {
        responseContent += `\n\nFailed to schedule ${results.failed.length} meeting(s): ${results.failed.map(f => f.title).join(', ')}`;
      }
    }

    const responseMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
    };

    return {
      message: responseMessage,
      suggestedActions: [],
    };

  } catch (error) {
    console.error('Failed to create event:', error);
    return null;
  }
}

/**
 * Helper to create multiple meetings
 */
interface ExtractedMeetingData {
  title: string;
  duration?: number;
  date?: string | null;
  time?: string | null;
  attendees?: string[];
  description?: string;
  location?: string;
}

async function createMultipleMeetings(
  meetings: ExtractedMeetingData[],
  userId: string,
  preferences: UserPreferences,
  userTimezone: string,
  originalMessage: string,
  today: Date,
  tomorrow: Date
): Promise<{
  created: Array<{ title: string; start: Date; end: Date; attendees: string[] }>;
  failed: Array<{ title: string; error: string }>;
}> {
  const created: Array<{ title: string; start: Date; end: Date; attendees: string[] }> = [];
  const failed: Array<{ title: string; error: string }> = [];

  for (const meeting of meetings) {
    try {
      if (!meeting.title || typeof meeting.title !== 'string') {
        throw new Error('Invalid meeting title');
      }

      // Parse date with smart defaults
      let eventDate: Date;
      if (meeting.date && typeof meeting.date === 'string') {
        const parsedDate = new Date(meeting.date + 'T00:00:00');
        eventDate = !isNaN(parsedDate.getTime()) ? parsedDate : tomorrow;
      } else {
        // Smart date detection
        const lowerMessage = originalMessage.toLowerCase();
        if (lowerMessage.includes('tomorrow')) {
          eventDate = tomorrow;
        } else if (lowerMessage.includes('today')) {
          eventDate = today;
        } else if (lowerMessage.includes('next monday') || lowerMessage.includes('monday')) {
          const nextMonday = new Date(today);
          const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
          nextMonday.setDate(today.getDate() + daysUntilMonday);
          eventDate = nextMonday;
        } else if (lowerMessage.includes('friday')) {
          const nextFriday = new Date(today);
          const daysUntilFriday = (12 - today.getDay()) % 7 || 7;
          nextFriday.setDate(today.getDate() + daysUntilFriday);
          eventDate = nextFriday;
        } else if (lowerMessage.includes('next week')) {
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          eventDate = nextWeek;
        } else {
          eventDate = tomorrow;
        }
      }

      // Parse time
      let eventTime: string;
      if (meeting.time && typeof meeting.time === 'string' && /^(\d{1,2}):(\d{2})$/.test(meeting.time)) {
        const [hours, minutes] = meeting.time.split(':').map(Number);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          eventTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
          eventTime = preferences.workingHours?.start || '10:00';
        }
      } else {
        eventTime = preferences.workingHours?.start || '10:00';
      }

      const duration = typeof meeting.duration === 'number' && meeting.duration > 0
        ? Math.max(15, Math.min(480, meeting.duration))
        : 30;

      const eventStart = createDateFromStrings(
        eventDate.toISOString().split('T')[0],
        eventTime,
        userTimezone
      );
      const eventEnd = new Date(eventStart.getTime() + duration * 60 * 1000);

      // Ensure not in past
      if (isInPast(eventStart, userTimezone)) {
        eventStart.setDate(eventStart.getDate() + 1);
        eventEnd.setDate(eventEnd.getDate() + 1);
      }

      // Validate attendees
      const validAttendees = Array.isArray(meeting.attendees)
        ? meeting.attendees.filter((email): email is string => {
            if (typeof email !== 'string') return false;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email) && email.length <= 254;
          })
        : [];

      const eventData = {
        title: meeting.title.substring(0, 100).trim(),
        description: (meeting.description || '').substring(0, 1000).trim(),
        start: eventStart,
        end: eventEnd,
        timezone: userTimezone,
        attendees: validAttendees,
        location: (meeting.location || '').substring(0, 200).trim(),
      };

      const createdEvent = await createEvent(userId, eventData);
      created.push({
        title: createdEvent.title,
        start: eventStart,
        end: eventEnd,
        attendees: validAttendees,
      });

    } catch (error) {
      console.error(`Failed to create meeting "${meeting.title}":`, error);
      failed.push({
        title: meeting.title || 'Unknown meeting',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { created, failed };
}

/**
 * Get tomorrow's date as YYYY-MM-DD
 */
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Detect potential suggested actions based on message content
 */
function detectSuggestedActions(response: string, userMessage: string): ActionButton[] {
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
 * Generate action items from schedule
 */
function generateActionItems(schedule: DaySchedule): ActionItem[] {
  const items: ActionItem[] = [];

  // Check for conflicts (overlapping events)
  const events = [...schedule.events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  for (let i = 0; i < events.length - 1; i++) {
    const current = events[i];
    const next = events[i + 1];

    if (new Date(current.end) > new Date(next.start)) {
      items.push({
        id: generateId(),
        type: 'conflict',
        title: 'Schedule conflict',
        description: `"${current.title}" overlaps with "${next.title}"`,
        actions: [
          { label: 'Resolve', action: 'open_chat' },
          { label: 'Dismiss', action: 'dismiss' },
        ],
      });
    }
  }

  // Check for meetings without agendas
  const meetingsWithoutAgenda = events.filter(
    (e) => (e.category === 'meeting' || e.category === 'external') && !e.hasAgenda
  );

  for (const meeting of meetingsWithoutAgenda.slice(0, 2)) {
    items.push({
      id: generateId(),
      type: 'reminder',
      title: 'Meeting without agenda',
      description: `"${meeting.title}" has no agenda set`,
      actions: [
        { label: 'Add agenda', action: 'edit' },
        { label: 'Dismiss', action: 'dismiss' },
      ],
    });
  }

  return items;
}

/**
 * Generate a quick insight for the brief
 */
function generateQuickInsight(schedule: DaySchedule): Insight | undefined {
  const { stats } = schedule;
  const totalScheduled = stats.meetingMinutes + stats.focusMinutes;
  const workdayMinutes = 8 * 60;

  if (stats.meetingMinutes > workdayMinutes * 0.6) {
    return {
      id: generateId(),
      type: 'warning',
      message: `Heavy meeting day ahead with ${Math.round(stats.meetingMinutes / 60)} hours of meetings.`,
      actionable: true,
      action: {
        label: 'Find breaks',
        prompt: 'Can you help me find some break time between my meetings today?',
      },
    };
  }

  if (stats.availableMinutes > workdayMinutes * 0.5) {
    return {
      id: generateId(),
      type: 'observation',
      message: 'Light day ahead. Good time for focused work or catching up.',
      actionable: false,
    };
  }

  if (schedule.events.length > 6) {
    return {
      id: generateId(),
      type: 'observation',
      message: `${schedule.events.length} events on your calendar today. Paced scheduling.`,
      actionable: false,
    };
  }

  return undefined;
}

/**
 * Get a time-based greeting
 */
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a mock schedule for development
 */
export function createMockSchedule(date: Date = new Date()): DaySchedule {
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  const timezone = 'America/Los_Angeles';
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
