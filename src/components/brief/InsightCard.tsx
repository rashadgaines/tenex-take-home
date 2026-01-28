'use client';

import { Card, Button } from '@/components/ui';
import { Insight } from '@/types';

interface InsightCardProps {
  insight: Insight;
  onAction: (prompt: string) => void;
  onDismiss: () => void;
}

const typeIcons: Record<Insight['type'], React.ReactNode> = {
  observation: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  suggestion: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
};

const typeStyles: Record<Insight['type'], { icon: string; bg: string }> = {
  observation: { icon: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-tertiary)]' },
  warning: { icon: 'text-[var(--status-warning)]', bg: 'bg-amber-900/20' },
  suggestion: { icon: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-tertiary)]' },
};

export function InsightCard({ insight, onAction, onDismiss }: InsightCardProps) {
  const styles = typeStyles[insight.type];

  return (
    <Card padding="md" className="border-l-4 border-l-[var(--accent-primary)]">
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.bg} ${styles.icon}`}>
          {typeIcons[insight.type]}
        </div>
        <div className="flex-1">
          <p className="text-[var(--text-primary)] leading-relaxed">
            &ldquo;{insight.message}&rdquo;
          </p>
          {insight.actionable && insight.action && (
            <div className="flex gap-2 mt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAction(insight.action!.prompt)}
              >
                {insight.action.label}
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
