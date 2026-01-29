'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainCanvas } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProtectedTimeEditor } from '@/components/settings';
import { getAvailableTimezones } from '@/lib/user-preferences';

interface UserPreferences {
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  protectedTimes: Array<{
    label?: string;
    start: string;
    end: string;
    days: number[];
  }>;
  defaultMeetingDuration: number;
  weekStartsOn: number;
}

const TIMEZONES = [
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

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/preferences');

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch preferences');
        }

        const data = await response.json();
        setPreferences(data);
      } catch (err) {
        console.error('Failed to fetch preferences:', err);
        setError('Unable to load preferences. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreferences();
  }, [router]);

  const handleSave = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!preferences) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save preferences');
      }

      const updatedPrefs = await response.json();
      setPreferences(updatedPrefs);
      setSuccessMessage('Preferences saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  }, [preferences]);

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!preferences) return;
    const newTimezone = e.target.value;
    setPreferences({ ...preferences, timezone: newTimezone });
    handleSave({ timezone: newTimezone });
  };

  const handleWorkingHoursChange = (field: 'start' | 'end', value: string) => {
    if (!preferences) return;
    const newWorkingHours = { ...preferences.workingHours, [field]: value };
    setPreferences({ ...preferences, workingHours: newWorkingHours });
  };

  const handleWorkingHoursSave = () => {
    if (!preferences) return;
    handleSave({ workingHours: preferences.workingHours });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!preferences) return;
    const newDuration = parseInt(e.target.value, 10);
    setPreferences({ ...preferences, defaultMeetingDuration: newDuration });
    handleSave({ defaultMeetingDuration: newDuration });
  };

  const handleProtectedTimesChange = (times: UserPreferences['protectedTimes']) => {
    if (!preferences) return;
    setPreferences({ ...preferences, protectedTimes: times });
    handleSave({ protectedTimes: times });
  };

  // Loading state
  if (isLoading) {
    return (
      <MainCanvas>
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-[var(--bg-tertiary)] rounded-xl w-48" />
            <div className="h-48 bg-[var(--bg-tertiary)] rounded-xl" />
            <div className="h-48 bg-[var(--bg-tertiary)] rounded-xl" />
            <div className="h-64 bg-[var(--bg-tertiary)] rounded-xl" />
          </div>
        </div>
      </MainCanvas>
    );
  }

  // Error state
  if (error && !preferences) {
    return (
      <MainCanvas>
        <div className="max-w-3xl mx-auto">
          <Card padding="lg">
            <div className="text-center py-8">
              <p className="text-[var(--text-secondary)] mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          </Card>
        </div>
      </MainCanvas>
    );
  }

  if (!preferences) return null;

  return (
    <MainCanvas>
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Configure your calendar preferences and protected times
          </p>
        </div>

        {/* Status Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* General Settings */}
          <Card padding="lg">
            <CardHeader
              title="General"
              subtitle="Basic calendar settings"
            />

            <div className="space-y-6">
              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Timezone
                </label>
                <select
                  value={preferences.timezone}
                  onChange={handleTimezoneChange}
                  disabled={isSaving}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Meeting Duration */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                  Default Meeting Duration
                </label>
                <select
                  value={preferences.defaultMeetingDuration}
                  onChange={handleDurationChange}
                  disabled={isSaving}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Working Hours */}
          <Card padding="lg">
            <CardHeader
              title="Working Hours"
              subtitle="Set your typical work schedule"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="time"
                value={preferences.workingHours.start}
                onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                onBlur={handleWorkingHoursSave}
                disabled={isSaving}
              />
              <Input
                label="End Time"
                type="time"
                value={preferences.workingHours.end}
                onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                onBlur={handleWorkingHoursSave}
                disabled={isSaving}
              />
            </div>

            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Meetings will be scheduled within these hours unless specified otherwise.
            </p>
          </Card>

          {/* Protected Times */}
          <ProtectedTimeEditor
            protectedTimes={preferences.protectedTimes}
            onChange={handleProtectedTimesChange}
            isSaving={isSaving}
          />

          {/* Info Card */}
          <Card padding="md" variant="outlined">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">
                  You can also configure protected times via chat. Try saying:
                </p>
                <p className="text-sm text-[var(--text-primary)] mt-1 font-medium">
                  &ldquo;Block my mornings from 6-9am for workouts&rdquo;
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainCanvas>
  );
}
