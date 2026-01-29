/**
 * Protected time handling functionality
 */
import { ChatResponse, ChatMessage } from '@/types/ai';
import { UserPreferences } from '@/types/user';
import { getUserPreferences, updateUserPreferences } from '../../user-preferences';
import { getOpenAIClient, generateId, cleanJsonResponse } from './utils';
import { ProtectedTimeDetails } from './types';

/**
 * Detect and handle protected time requests
 */
export async function detectAndHandleProtectedTimeRequest(
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

    let protectedTimeDetails: ProtectedTimeDetails;
    try {
      const cleanText = cleanJsonResponse(extractionText);
      protectedTimeDetails = JSON.parse(cleanText);
    } catch (parseError) {
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
    return null; // Fall back to normal AI response
  }
}
