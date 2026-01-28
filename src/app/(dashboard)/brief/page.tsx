'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainCanvas } from '@/components/layout';
import { Card } from '@/components/ui';
import { BriefHeader, ActionCard, TodaySchedule, InsightCard } from '@/components/brief';
import { getGreeting } from '@/lib/mocks';
import type { BriefData } from '@/types/ai';

export default function BriefPage() {
  const router = useRouter();
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch brief data on mount
  useEffect(() => {
    async function fetchBrief() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/ai/brief');

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch brief');
        }

        const data = await response.json();

        // Parse dates from JSON
        data.date = new Date(data.date);
        data.todaySchedule.date = new Date(data.todaySchedule.date);
        data.todaySchedule.events = data.todaySchedule.events.map((event: { start: string; end: string }) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        data.todaySchedule.availableSlots = data.todaySchedule.availableSlots.map((slot: { start: string; end: string }) => ({
          ...slot,
          start: new Date(slot.start),
          end: new Date(slot.end),
        }));

        setBriefData(data);
      } catch (err) {
        console.error('Failed to fetch brief:', err);
        setError('Unable to load your brief. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBrief();
  }, [router]);

  // Handle action button clicks
  const handleAction = async (action: string, payload?: unknown) => {
    const payloadData = payload as { suggestionId?: string; draftId?: string } | undefined;

    switch (action) {
      case 'suggest_times':
        // Navigate to Plan page with pre-filled prompt
        router.push('/plan?prompt=' + encodeURIComponent('Help me find times for a meeting'));
        break;

      case 'send_email':
        if (payloadData?.suggestionId) {
          try {
            const response = await fetch(`/api/email/suggestions/${payloadData.suggestionId}/send`, {
              method: 'POST',
            });
            if (response.ok) {
              // Remove the action item from the list
              setBriefData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  actionItems: prev.actionItems.filter(
                    (item) => !item.id.includes(payloadData.suggestionId!)
                  ),
                };
              });
            }
          } catch (err) {
            console.error('Failed to send email:', err);
          }
        }
        break;

      case 'dismiss':
        if (payloadData?.suggestionId) {
          try {
            const response = await fetch(`/api/email/suggestions/${payloadData.suggestionId}/dismiss`, {
              method: 'POST',
            });
            if (response.ok) {
              // Remove the action item from the list
              setBriefData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  actionItems: prev.actionItems.filter(
                    (item) => !item.id.includes(payloadData.suggestionId!)
                  ),
                };
              });
            }
          } catch (err) {
            console.error('Failed to dismiss suggestion:', err);
          }
        }
        break;

      case 'edit':
        // Navigate to Plan page with edit context
        router.push('/plan?prompt=' + encodeURIComponent('Help me edit this email draft'));
        break;

      case 'open_chat':
        router.push('/plan');
        break;

      case 'decline':
        router.push('/plan?prompt=' + encodeURIComponent('Help me politely decline this meeting request'));
        break;

      default:
        console.log('Unhandled action:', action, payload);
    }
  };

  // Handle insight action clicks
  const handleInsightAction = (prompt: string) => {
    router.push('/plan?prompt=' + encodeURIComponent(prompt));
  };

  // Handle dismiss insight
  const handleDismissInsight = () => {
    setBriefData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        insight: undefined,
      };
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <MainCanvas>
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-[var(--bg-tertiary)] rounded-xl" />
            <div className="h-48 bg-[var(--bg-tertiary)] rounded-xl" />
            <div className="h-32 bg-[var(--bg-tertiary)] rounded-xl" />
          </div>
        </div>
      </MainCanvas>
    );
  }

  // Error state
  if (error || !briefData) {
    return (
      <MainCanvas>
        <div className="max-w-3xl mx-auto">
          <Card padding="lg">
            <div className="text-center py-8">
              <p className="text-[var(--text-secondary)] mb-4">
                {error || 'Something went wrong'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-lg"
              >
                Try again
              </button>
            </div>
          </Card>
        </div>
      </MainCanvas>
    );
  }

  const greeting = getGreeting();

  return (
    <MainCanvas>
      <div className="max-w-3xl mx-auto">
        <BriefHeader
          greeting={greeting}
          date={briefData.date}
          summary={briefData.summary}
          userName={briefData.greeting.split(' ').pop() || 'there'}
        />

        {/* Action Items Section */}
        {briefData.actionItems.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Action Needed
            </h2>
            {briefData.actionItems.map((item) => (
              <ActionCard key={item.id} item={item} onAction={handleAction} />
            ))}
          </section>
        )}

        {/* Today's Schedule */}
        <section className="mb-6">
          <TodaySchedule events={briefData.todaySchedule.events} />
        </section>

        {/* AI Insight */}
        {briefData.insight && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Observation
            </h2>
            <InsightCard
              insight={briefData.insight}
              onAction={handleInsightAction}
              onDismiss={handleDismissInsight}
            />
          </section>
        )}

        {/* Quick Stats */}
        <section>
          <Card padding="md">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {briefData.todaySchedule.events.length}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">meetings today</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {Math.round(briefData.todaySchedule.stats.availableMinutes / 60)}h
                </p>
                <p className="text-sm text-[var(--text-secondary)]">open time</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {briefData.actionItems.length}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">pending actions</p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </MainCanvas>
  );
}
