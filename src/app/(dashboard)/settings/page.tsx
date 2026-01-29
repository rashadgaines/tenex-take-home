'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { MainCanvas } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ProtectedTimeEditor,
  WorkingHoursEditor,
  AccountSection,
  DangerZoneSection,
  SettingsNav,
  SettingsIcons
} from '@/components/settings';
import { useToast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';

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

const NAV_ITEMS = [
  { id: 'general', label: 'General', icon: SettingsIcons.general },
  { id: 'working-hours', label: 'Working Hours', icon: SettingsIcons.workingHours },
  { id: 'protected-time', label: 'Protected Time', icon: SettingsIcons.protectedTime },
  { id: 'account', label: 'Account', icon: SettingsIcons.account },
  { id: 'danger', label: 'Danger Zone', icon: SettingsIcons.danger, danger: true },
];

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs for section scrolling
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Track unsaved changes
  useEffect(() => {
    if (preferences && originalPreferences) {
      const changed = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
      setHasUnsavedChanges(changed);
    }
  }, [preferences, originalPreferences]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

        const responseData = await response.json();
        const data = responseData.data ?? responseData;
        setPreferences(data);
        setOriginalPreferences(data);
      } catch (err) {
        toast.error('Unable to load preferences. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreferences();
  }, [router, toast]);

  const handleSave = useCallback(async (updates: Partial<UserPreferences>, showToast = true) => {
    if (!preferences) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to save preferences');
      }

      const responseData = await response.json();
      const updatedPrefs = responseData.data ?? responseData;
      setPreferences(updatedPrefs);
      setOriginalPreferences(updatedPrefs);

      if (showToast) {
        toast.success('Settings saved');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  }, [preferences, toast]);

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!preferences) return;
    const newTimezone = e.target.value;
    setPreferences({ ...preferences, timezone: newTimezone });
    handleSave({ timezone: newTimezone });
  };

  const handleWorkingHoursChange = (workingHours: UserPreferences['workingHours']) => {
    if (!preferences) return;
    setPreferences({ ...preferences, workingHours });
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
    handleSave({ protectedTimes: times }, false);
  };

  const handleDisconnect = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleDeleteData = async () => {
    // In a real app, this would call an API to delete user data
    toast.info('Data deletion requested. This would delete all your data in production.');
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleExportData = async () => {
    // In a real app, this would call an API to export user data
    const dataToExport = {
      preferences,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenex-data-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Data exported successfully');
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const ref = sectionRefs.current[sectionId];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <MainCanvas>
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-[var(--bg-tertiary)] rounded-xl w-48" />
            <div className="flex gap-8">
              <div className="w-56 space-y-2">
                <div className="h-10 bg-[var(--bg-tertiary)] rounded-lg" />
                <div className="h-10 bg-[var(--bg-tertiary)] rounded-lg" />
                <div className="h-10 bg-[var(--bg-tertiary)] rounded-lg" />
                <div className="h-10 bg-[var(--bg-tertiary)] rounded-lg" />
              </div>
              <div className="flex-1 space-y-6">
                <div className="h-48 bg-[var(--bg-tertiary)] rounded-xl" />
                <div className="h-48 bg-[var(--bg-tertiary)] rounded-xl" />
                <div className="h-64 bg-[var(--bg-tertiary)] rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </MainCanvas>
    );
  }

  // Error state - no preferences loaded
  if (!preferences) {
    return (
      <MainCanvas>
        <div className="max-w-5xl mx-auto">
          <Card padding="lg">
            <div className="text-center py-8">
              <p className="text-[var(--text-secondary)] mb-4">Unable to load settings</p>
              <Button onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          </Card>
        </div>
      </MainCanvas>
    );
  }

  return (
    <MainCanvas>
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Configure your calendar preferences and account settings
            </p>
          </div>

          {/* Unsaved changes indicator */}
          <AnimatePresence>
            {hasUnsavedChanges && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full"
              >
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm text-amber-400">Unsaved changes</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-56 flex-shrink-0">
            <div className="sticky top-6">
              <SettingsNav
                items={NAV_ITEMS}
                activeSection={activeSection}
                onSelect={scrollToSection}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-8 pb-12">
            {/* General Settings */}
            <section
              ref={(el) => { sectionRefs.current['general'] = el; }}
              id="general"
            >
              <Card padding="lg">
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      {SettingsIcons.general}
                      General
                    </span>
                  }
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
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-sm text-[var(--text-tertiary)]">
                      All times will be displayed in this timezone
                    </p>
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
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                    >
                      {DURATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-sm text-[var(--text-tertiary)]">
                      Used when scheduling new meetings without a specified duration
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Working Hours */}
            <section
              ref={(el) => { sectionRefs.current['working-hours'] = el; }}
              id="working-hours"
            >
              <WorkingHoursEditor
                workingHours={preferences.workingHours}
                timezone={preferences.timezone}
                onChange={handleWorkingHoursChange}
                onSave={handleWorkingHoursSave}
                isSaving={isSaving}
              />
            </section>

            {/* Protected Times */}
            <section
              ref={(el) => { sectionRefs.current['protected-time'] = el; }}
              id="protected-time"
            >
              <ProtectedTimeEditor
                protectedTimes={preferences.protectedTimes}
                onChange={handleProtectedTimesChange}
                isSaving={isSaving}
              />
            </section>

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

            {/* Account Section */}
            <section
              ref={(el) => { sectionRefs.current['account'] = el; }}
              id="account"
            >
              {session?.user && (
                <AccountSection
                  user={session.user}
                  onDisconnect={handleDisconnect}
                />
              )}
            </section>

            {/* Danger Zone */}
            <section
              ref={(el) => { sectionRefs.current['danger'] = el; }}
              id="danger"
            >
              <DangerZoneSection
                onDeleteData={handleDeleteData}
                onExportData={handleExportData}
              />
            </section>
          </main>
        </div>
      </div>
    </MainCanvas>
  );
}
