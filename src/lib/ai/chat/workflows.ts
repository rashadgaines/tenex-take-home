/**
 * Workflow orchestration for multi-step operations
 */
import { ChatMessage, Workflow, WorkflowPlan, WorkflowChatResponse, ActionButton } from '@/types/ai';
import { DaySchedule } from '@/types/calendar';
import { UserPreferences } from '@/types/user';
import { createDateFromStrings, isInPast } from '../../date-utils';
import { getUserTimezone } from '../../user-preferences';
import { createEvent } from '@/lib/google/calendar';
import { getOpenAIClient, generateId, cleanJsonResponse } from './utils';
import { detectAndHandleSchedulingRequest } from './scheduling';
import { detectAndHandleProtectedTimeRequest } from './protected-time';
import { generateBatchEmailDrafts } from './email';
import { sendEmail } from '@/lib/google/gmail';
import { generateSubjectLine } from '@/lib/email/subject';

/**
 * Detect multi-step workflow requests and execute them
 */
export async function detectAndExecuteWorkflow(
  message: string,
  schedule: DaySchedule,
  preferences: UserPreferences,
  userId: string,
  userName?: string
): Promise<WorkflowChatResponse | null> {
  const lowerMessage = message.toLowerCase();

  // Skip workflow detection for simple scheduling requests
  // These should be handled by the normal scheduling flow
  const simpleSchedulingPatterns = [
    /^(schedule|set up|create|book|plan)\s+(a\s+)?(meeting|call|event)/i,
    /^(can you\s+)?(schedule|set up|book)\s+/i,
  ];
  const isSimpleScheduling = simpleSchedulingPatterns.some(p => p.test(message.trim()));

  // Only consider it multi-step if it has BOTH a scheduling action AND a separate email/preference action
  const hasScheduleAction = /\b(schedule|book|set up|create)\s+(a\s+)?(meeting|call|event)/i.test(lowerMessage);
  const hasEmailAction = /\b(email|send|draft|write).+(to|for|them|her|him)\b/i.test(lowerMessage) ||
    /\b(and|then)\s+(email|send|draft)/i.test(lowerMessage);
  const hasPreferenceAction = /\b(block|protect)\s+(my|the)?\s*(morning|afternoon|lunch|time)/i.test(lowerMessage);

  // Must have at least two different action types
  const actionCount = [hasScheduleAction, hasEmailAction, hasPreferenceAction].filter(Boolean).length;

  if (isSimpleScheduling || actionCount < 2) {
    return null;
  }

  // Additional check: must have explicit connectors between actions
  const hasExplicitConnector = /\b(and\s+then|then\s+also|and\s+also|after\s+that|,\s*then)\b/i.test(lowerMessage) ||
    /\b(schedule|book).+\b(and|then)\b.+(email|send|draft)/i.test(lowerMessage);

  if (!hasExplicitConnector) {
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
      const cleanText = cleanJsonResponse(analysisText);
      workflowPlan = JSON.parse(cleanText);
    } catch {
      return null;
    }

    // Only proceed if genuinely multi-step
    if (!workflowPlan.isMultiStep || !Array.isArray(workflowPlan.steps) || workflowPlan.steps.length < 2) {
      return null;
    }

    // Execute the workflow
    return await executeWorkflow(workflowPlan, message, schedule, preferences, userId, userName);

  } catch (error) {
    return null;
  }
}

/**
 * Execute a multi-step workflow
 */
export async function executeWorkflow(
  plan: WorkflowPlan,
  originalMessage: string,
  schedule: DaySchedule,
  preferences: UserPreferences,
  userId: string,
  userName?: string
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
          // Try the scheduling handler first, fall back to direct creation
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
            // Fallback: create event directly from step params
            const meetingParams = step.params as {
              title?: string;
              attendees?: string[];
              date?: string;
              time?: string;
              duration?: number;
            };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Parse date
            let eventDate = tomorrow;
            if (meetingParams.date) {
              const parsedDate = new Date(meetingParams.date + 'T00:00:00');
              if (!isNaN(parsedDate.getTime())) {
                eventDate = parsedDate;
              }
            } else if (originalMessage.toLowerCase().includes('tomorrow')) {
              eventDate = tomorrow;
            } else if (originalMessage.toLowerCase().includes('today')) {
              eventDate = today;
            }

            // Parse time
            const eventTime = meetingParams.time || preferences.workingHours?.start || '10:00';
            const duration = meetingParams.duration || 30;

            // Create title from description or params
            const title = meetingParams.title || step.description || 'Meeting';

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
            const validAttendees = Array.isArray(meetingParams.attendees)
              ? meetingParams.attendees.filter((email): email is string => {
                if (typeof email !== 'string') return false;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
              })
              : [];

            const eventData = {
              title: title.substring(0, 100).trim(),
              description: '',
              start: eventStart,
              end: eventEnd,
              timezone: userTimezone,
              attendees: validAttendees,
              location: '',
            };

            const createdEvent = await createEvent(userId, eventData);
            const resultMsg = `Scheduled "${createdEvent.title}" for ${eventStart.toLocaleDateString('en-US', { timeZone: userTimezone })} at ${eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: userTimezone })}`;
            workflow.steps[i].result = resultMsg;
            results.push(`Scheduling: ${resultMsg}`);
          }
          break;
        }

        case 'email': {
          // Extract email recipients from params or original message
          const recipients = extractRecipientsFromMessage(originalMessage, step.params);
          if (recipients.length > 0) {
            const { drafts, failed } = await generateBatchEmailDrafts({
              userName: userName || 'User',
              recipients,
              purpose: step.description || 'follow up',
              tone: 'neutral',
              specificContent: originalMessage,
            });

            if (drafts.length > 0) {
              // ALWAYS draft first for regular emails in workflows to ensure accuracy and user confirmation
              workflow.steps[i].result = { drafts, failed };
              const firstDraft = drafts[0];
              const subject = generateSubjectLine(step.description || 'Meeting Request');

              results.push(`Email draft created for ${recipients.map(r => r.name || r.email).join(', ')}:

To: ${firstDraft.email}
Subject: ${subject}

---
${firstDraft.body}
---`);
              if (drafts.length > 1) {
                results.push(`(Plus ${drafts.length - 1} more draft(s))`);
              }
              results.push(`\n**Ready to send?** Say "send it" or "looks good".`);
            } else {
              throw new Error('Failed to generate email drafts');
            }
          } else {
            results.push(`Email: Ready (recipients to be specified)`);
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
      workflow.steps[i].status = 'failed';
      workflow.steps[i].error = error instanceof Error ? error.message : 'Step failed';
      results.push(`${step.description}: Failed`);
    }
  }

  workflow.status = workflow.steps.every(s => s.status === 'completed')
    ? 'completed'
    : 'failed';
  workflow.summary = results.join('\n');

  // Build action steps display
  const actionSteps: string[] = [];
  for (const step of workflow.steps) {
    const icon = step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : '○';
    actionSteps.push(`  ${icon} ${step.description}`);
  }
  const stepsDisplay = actionSteps.join('\n');

  const responseMessage: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: `${stepsDisplay}\n\n${workflow.summary}\n\n**Done!** Ready to proceed?`,
    timestamp: new Date(),
  };

  // If there's a pending email draft, suggest sending it
  const suggestedActions: ActionButton[] = [];
  const hasEmailDraft = workflow.steps.some(s => s.type === 'email' && (s.result as any)?.drafts?.length > 0);
  if (hasEmailDraft) {
    suggestedActions.push({
      label: 'Send now',
      action: 'open_chat',
      payload: { message: 'send it' },
      disabled: !(workflow.steps.find(s => s.type === 'email')?.result as any)?.drafts?.[0]?.email
    });
    suggestedActions.push({
      label: 'Enhance with AI',
      action: 'open_chat',
      payload: { message: 'enhance draft' }
    });
    const emailStep = workflow.steps.find(s => s.type === 'email');
    if ((emailStep?.result as any)?.drafts?.[0]) {
      const draft = (emailStep?.result as any).drafts[0];
      suggestedActions.push({
        label: 'Edit draft',
        action: 'edit',
        payload: { type: 'email', draft: { to: draft.email, body: draft.body } }
      });
    }
  }

  return {
    message: responseMessage,
    suggestedActions,
    workflow,
  };
}

/**
 * Extract recipient information from message and params
 */
export function extractRecipientsFromMessage(
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
