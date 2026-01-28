'use client';

import { MainCanvas } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { mockTimeAnalytics } from '@/lib/mocks';

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

export default function TimePage() {
  const analytics = mockTimeAnalytics;

  const handleInsightAction = (prompt: string) => {
    console.log('Opening chat with prompt:', prompt);
    // TODO: Open chat with pre-filled prompt
  };

  return (
    <MainCanvas
      title="Time Analytics"
      subtitle="Understand how you're spending your time"
    >
      <div className="max-w-3xl mx-auto">
        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {['Day', 'Week', 'Month'].map((period) => (
            <button
              key={period}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period.toLowerCase() === analytics.period
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-tertiary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Time Breakdown */}
        <Card padding="lg" className="mb-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-6">This Week</h3>

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
              <span className="font-medium text-[var(--text-primary)]">{analytics.totalMeetingHours} hours</span> in meetings this week
              {' · '}
              <span className="font-medium text-[var(--text-primary)]">{analytics.busiestDay}</span> is your busiest day
            </p>
          </div>
        </Card>

        {/* Insights */}
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
              'Compare this month to last month',
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
