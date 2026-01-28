'use client';

import { MainCanvas } from '@/components/layout';
import { Card } from '@/components/ui';
import { BriefHeader, ActionCard, TodaySchedule, InsightCard } from '@/components/brief';
import {
  mockBriefData,
  getGreeting,
} from '@/lib/mocks';

export default function BriefPage() {
  const briefData = mockBriefData;
  const greeting = getGreeting();

  const handleAction = (action: string, payload?: unknown) => {
    console.log('Action triggered:', action, payload);
    // TODO: Connect to actual action handlers
  };

  const handleInsightAction = (prompt: string) => {
    console.log('Insight action with prompt:', prompt);
    // TODO: Open chat with pre-filled prompt
  };

  const handleDismissInsight = () => {
    console.log('Insight dismissed');
    // TODO: Dismiss insight
  };

  return (
    <MainCanvas>
      <div className="max-w-3xl mx-auto">
        <BriefHeader
          greeting={greeting}
          date={briefData.date}
          summary={briefData.summary}
          userName="Rashad"
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
