'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainCanvas } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { RecommendationList, RecommendationListSkeleton } from '@/components/recommendations';
import type { TimeAnalytics, Recommendation } from '@/types/ai';

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

const periodLabels: Record<string, string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
};

interface AnalyticsWithRecommendations extends TimeAnalytics {
  recommendations?: Recommendation[];
}

export default function TimePage() {
  const router = useRouter();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [analytics, setAnalytics] = useState<AnalyticsWithRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/ai/analytics?period=${period}`);

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError('Unable to load analytics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, [period, router]);

  const handlePeriodChange = (newPeriod: 'day' | 'week' | 'month') => {
    setPeriod(newPeriod);
  };

  const handleInsightAction = (prompt: string) => {
    router.push('/plan?prompt=' + encodeURIComponent(prompt));
  };

  // Handle executing a recommendation
  const handleExecuteRecommendation = useCallback(async (recommendation: Recommendation): Promise<{ success: boolean; message: string }> => {
    try {
      // Determine the action type based on recommendation type
      let actionType: string;
      let payload: Record<string, unknown> = {};

      switch (recommendation.type) {
        case 'schedule_focus_time': {
          actionType = 'schedule_focus_time';
          const suggestedSlots = recommendation.action.payload.suggestedSlots as Array<{
            start: string;
            end: string;
            timezone: string;
          }>;
          if (suggestedSlots && suggestedSlots.length > 0) {
            // Use the first available slot
            const slot = suggestedSlots[0];
            payload = {
              slot: {
                start: slot.start,
                end: slot.end,
              },
              title: (recommendation.action.payload.defaultTitle as string) || 'Focus Time',
              description: (recommendation.action.payload.defaultDescription as string) || 'Protected time for deep work.',
            };
          }
          break;
        }
        case 'add_buffer': {
          actionType = 'add_buffer';
          const meetingPairs = recommendation.action.payload.meetingPairs as Array<{
            firstMeetingId: string;
            suggestedBufferStart: string;
            suggestedBufferEnd: string;
          }>;
          if (meetingPairs && meetingPairs.length > 0) {
            const pair = meetingPairs[0];
            payload = {
              meetingId: pair.firstMeetingId,
              slot: {
                start: pair.suggestedBufferStart,
                end: pair.suggestedBufferEnd,
              },
              bufferMinutes: recommendation.action.payload.bufferMinutes || 15,
            };
          }
          break;
        }
        case 'reschedule': {
          actionType = 'reschedule_meeting';
          break;
        }
        case 'decline_meeting': {
          actionType = 'decline_meeting';
          break;
        }
        case 'batch_meetings': {
          // For batch meetings, redirect to the plan page with a prompt
          router.push('/plan?prompt=' + encodeURIComponent(recommendation.action.prompt));
          return { success: true, message: 'Redirecting to planning assistant...' };
        }
        default:
          return { success: false, message: 'Unknown recommendation type' };
      }

      const response = await fetch('/api/ai/recommendations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendationId: recommendation.id,
          actionType,
          payload,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to execute recommendation',
        };
      }

      return {
        success: true,
        message: result.message || 'Recommendation applied successfully',
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      };
    }
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <MainCanvas
        title="Time Analytics"
        subtitle="Understand how you're spending your time"
      >
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-20 bg-[var(--bg-tertiary)] rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-[var(--bg-tertiary)] rounded-xl" />
            <div className="h-48 bg-[var(--bg-tertiary)] rounded-xl" />
            <RecommendationListSkeleton />
          </div>
        </div>
      </MainCanvas>
    );
  }

  // Error state
  if (error || !analytics) {
    return (
      <MainCanvas
        title="Time Analytics"
        subtitle="Understand how you're spending your time"
      >
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

  return (
    <MainCanvas
      title="Time Analytics"
      subtitle="Understand how you're spending your time"
    >
      <div className="max-w-3xl mx-auto">
        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                p === period
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-tertiary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Time Breakdown */}
        <Card padding="lg" className="mb-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-6">
            {periodLabels[period]}
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">Meetings</span>
                <span className="text-sm text-[var(--text-secondary)]">{analytics.meetingPercent}%</span>
              </div>
              <ProgressBar value={analytics.meetingPercent} color="bg-[var(--accent-primary)]" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">Focus time</span>
                <span className="text-sm text-[var(--text-secondary)]">{analytics.focusPercent}%</span>
              </div>
              <ProgressBar value={analytics.focusPercent} color="bg-[var(--status-success)]" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">Available</span>
                <span className="text-sm text-[var(--text-secondary)]">{analytics.availablePercent}%</span>
              </div>
              <ProgressBar value={analytics.availablePercent} color="bg-gray-400" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">Buffer</span>
                <span className="text-sm text-[var(--text-secondary)]">{analytics.bufferPercent}%</span>
              </div>
              <ProgressBar value={analytics.bufferPercent} color="bg-[var(--text-tertiary)]" />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border-light)]">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{analytics.totalMeetingHours} hours</span> in meetings
              {period !== 'day' && (
                <>
                  {' · '}
                  <span className="font-medium text-[var(--text-primary)]">{analytics.busiestDay}</span> is your busiest day
                </>
              )}
              {analytics.longestFocusBlock > 0 && (
                <>
                  {' · '}
                  <span className="font-medium text-[var(--text-primary)]">{analytics.longestFocusBlock} min</span> longest focus block
                </>
              )}
            </p>
          </div>
        </Card>

        {/* Actionable Recommendations */}
        {analytics.recommendations && analytics.recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Quick Actions
            </h3>
            <RecommendationList
              recommendations={analytics.recommendations}
              onExecuteRecommendation={handleExecuteRecommendation}
            />
          </div>
        )}

        {/* Insights */}
        {analytics.insights.length > 0 && (
          <Card padding="lg">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">Insights</h3>

            <div className="space-y-4">
              {analytics.insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg ${
                    insight.type === 'warning' ? 'bg-amber-900/20' : 'bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${
                      insight.type === 'warning' ? 'text-amber-600' : 'text-[var(--text-secondary)]'
                    }`}>
                      {insight.type === 'warning' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[var(--text-primary)]">{insight.message}</p>
                      {insight.actionable && insight.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 -ml-2"
                          onClick={() => handleInsightAction(insight.action!.prompt)}
                        >
                          {insight.action.label} →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Ask About Time */}
        <Card padding="lg" className="mt-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            Ask about your time
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              'How can I get more focus time?',
              'Which meetings could be async?',
              'Compare this week to last week',
            ].map((question) => (
              <button
                key={question}
                onClick={() => handleInsightAction(question)}
                className="px-3 py-2 text-sm bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {question}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </MainCanvas>
  );
}
