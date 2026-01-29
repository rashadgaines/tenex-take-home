'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import type { Recommendation } from '@/types/ai';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onExecute: (recommendation: Recommendation) => Promise<{ success: boolean; message: string }>;
  onDismiss: (recommendationId: string) => void;
}

const typeIcons: Record<Recommendation['type'], React.ReactNode> = {
  schedule_focus_time: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  add_buffer: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  batch_meetings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  decline_meeting: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  reschedule: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
};

const priorityStyles: Record<Recommendation['priority'], { bg: string; text: string; label: string }> = {
  high: {
    bg: 'bg-red-900/20',
    text: 'text-red-400',
    label: 'High Priority',
  },
  medium: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-400',
    label: 'Medium Priority',
  },
  low: {
    bg: 'bg-blue-900/20',
    text: 'text-blue-400',
    label: 'Low Priority',
  },
};

const actionLabels: Record<Recommendation['type'], string> = {
  schedule_focus_time: 'Schedule',
  add_buffer: 'Add Buffers',
  batch_meetings: 'View Suggestions',
  decline_meeting: 'View Details',
  reschedule: 'View Options',
};

export function RecommendationCard({
  recommendation,
  onExecute,
  onDismiss,
}: RecommendationCardProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const priority = priorityStyles[recommendation.priority];

  const handleExecute = async () => {
    setStatus('loading');
    setMessage(null);

    try {
      const result = await onExecute(recommendation);
      if (result.success) {
        setStatus('success');
        setMessage(result.message);
      } else {
        setStatus('error');
        setMessage(result.message || 'Failed to execute recommendation');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const handleDismiss = () => {
    onDismiss(recommendation.id);
  };

  return (
    <Card padding="md" className="mb-3 transition-all duration-300">
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${priority.bg} ${priority.text}`}>
          {typeIcons[recommendation.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Priority Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
              {priority.label}
            </span>
          </div>

          {/* Title & Description */}
          <h4 className="font-medium text-[var(--text-primary)]">{recommendation.title}</h4>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{recommendation.description}</p>

          {/* Impact */}
          <p className="text-sm text-[var(--text-tertiary)] mt-1 italic">
            {recommendation.impact}
          </p>

          {/* Status Message */}
          {status === 'success' && message && (
            <div className="mt-3 p-3 bg-emerald-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-emerald-400">{message}</span>
              </div>
            </div>
          )}

          {status === 'error' && message && (
            <div className="mt-3 p-3 bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm text-red-400">{message}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {status !== 'success' && (
            <div className="flex gap-2 mt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecute}
                isLoading={status === 'loading'}
                disabled={status === 'loading'}
              >
                {actionLabels[recommendation.type]}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                disabled={status === 'loading'}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Success state - show only dismiss */}
          {status === 'success' && (
            <div className="flex gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
