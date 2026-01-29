import { prisma } from './db';
import { DEFAULT_TIMEZONE } from './constants';

export interface UserPreferences {
  timezone: string;
  workingHours: {
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  protectedTimes: Array<{
    start: string; // HH:mm format
    end: string; // HH:mm format
    daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
  }>;
  defaultMeetingDuration: number; // minutes
  calendarIds?: string[]; // Google Calendar IDs to sync
  weekStartsOn: number; // 0 = Sunday, 1 = Monday
}

const DEFAULT_PREFERENCES: UserPreferences = {
  timezone: DEFAULT_TIMEZONE,
  workingHours: {
    start: '09:00',
    end: '17:00',
  },
  protectedTimes: [],
  defaultMeetingDuration: 30,
  calendarIds: [],
  weekStartsOn: 0, // Sunday
};

/**
 * Get user preferences from database
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user || !user.preferences) {
      return DEFAULT_PREFERENCES;
    }

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_PREFERENCES,
      ...(user.preferences as Partial<UserPreferences>),
    };
  } catch (error) {
    console.error('Failed to get user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user preferences in database
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  try {
    const currentPrefs = await getUserPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences };

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPrefs,
      },
    });

    return updatedPrefs;
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    throw new Error('Failed to update preferences');
  }
}

/**
 * Get user's timezone
 */
export async function getUserTimezone(userId: string): Promise<string> {
  const prefs = await getUserPreferences(userId);
  return prefs.timezone;
}

/**
 * Update user's timezone
 */
export async function updateUserTimezone(userId: string, timezone: string): Promise<void> {
  await updateUserPreferences(userId, { timezone });
}

/**
 * Get user's working hours
 */
export async function getUserWorkingHours(userId: string): Promise<UserPreferences['workingHours']> {
  const prefs = await getUserPreferences(userId);
  return prefs.workingHours;
}

/**
 * Get user's calendar IDs to sync
 */
export async function getUserCalendarIds(userId: string): Promise<string[]> {
  const prefs = await getUserPreferences(userId);
  return prefs.calendarIds || [];
}

/**
 * Check if a time slot conflicts with user's protected times
 */
export async function isProtectedTime(
  userId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const prefs = await getUserPreferences(userId);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  return prefs.protectedTimes.some(protectedTime => {
    if (!protectedTime.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }

    // Check if the time slot overlaps with protected time
    const protectedStart = protectedTime.start;
    const protectedEnd = protectedTime.end;

    // Simple overlap check: if startTime is before protectedEnd AND endTime is after protectedStart
    return startTime < protectedEnd && endTime > protectedStart;
  });
}

/**
 * Validate timezone string (basic validation)
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Use Intl.DateTimeFormat to validate timezone
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get available timezones (common ones)
 */
export function getAvailableTimezones(): Array<{ value: string; label: string }> {
  return [
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Australia/Sydney', label: 'Sydney' },
    { value: 'UTC', label: 'UTC' },
  ];
}