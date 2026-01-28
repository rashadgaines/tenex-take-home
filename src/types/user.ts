export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  preferences: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  workingHours: {
    start: string;  // "09:00"
    end: string;    // "17:00"
  };
  protectedTimes: ProtectedTime[];
  defaultMeetingDuration: number;  // minutes
  timezone: string;
}

export interface ProtectedTime {
  label: string;          // "Morning workout"
  days: number[];         // [1, 2, 3, 4, 5] = Mon-Fri
  start: string;          // "06:00"
  end: string;            // "09:00"
}

// Default preferences for new users
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  workingHours: {
    start: '09:00',
    end: '17:00',
  },
  protectedTimes: [],
  defaultMeetingDuration: 30,
  timezone: 'America/New_York',
};
