'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui';
import { RecommendationCard } from './RecommendationCard';
import type { Recommendation } from '@/types/ai';

interface RecommendationListProps {
  recommendations: Recommendation[];
  onExecuteRecommendation: (recommendation: Recommendation) => Promise<{ success: boolean; message: string }>;
  filterPriority?: Recommendation['priority'] | 'all';
}

export function RecommendationList({
  recommendations: initialRecommendations,
  onExecuteRecommendation,
  filterPriority = 'all',
}: RecommendationListProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedPriority, setSelectedPriority] = useState<Recommendation['priority'] | 'all'>(filterPriority);

  const handleDismiss = useCallback((recommendationId: string) => {
    setDismissedIds(prev => new Set([...prev, recommendationId]));
  }, []);

  // Filter out dismissed recommendations
  const visibleRecommendations = initialRecommendations.filter(
    rec => !dismissedIds.has(rec.id)
  );

  // Filter by priority if selected
  const filteredRecommendations = selectedPriority === 'all'
    ? visibleRecommendations
    : visibleRecommendations.filter(rec => rec.priority === selectedPriority);

  // Sort by priority (high first, then medium, then low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedRecommendations = [...filteredRecommendations].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Empty state
  if (sortedRecommendations.length === 0) {
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-900/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">
            No recommendations
          </h3>
          <p className="text-[var(--text-secondary)]">
            Your calendar looks great! No optimizations needed right now.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* Filter Buttons */}
      {visibleRecommendations.length > 1 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedPriority('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedPriority === 'all'
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All ({visibleRecommendations.length})
          </button>
          {['high', 'medium', 'low'].map((priority) => {
            const count = visibleRecommendations.filter(r => r.priority === priority).length;
            if (count === 0) return null;

            const colorClasses: Record<string, string> = {
              high: selectedPriority === priority ? 'bg-red-500 text-white' : 'bg-red-900/20 text-red-400',
              medium: selectedPriority === priority ? 'bg-amber-500 text-white' : 'bg-amber-900/20 text-amber-400',
              low: selectedPriority === priority ? 'bg-blue-500 text-white' : 'bg-blue-900/20 text-blue-400',
            };

            return (
              <button
                key={priority}
                onClick={() => setSelectedPriority(priority as Recommendation['priority'])}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${colorClasses[priority]}`}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Recommendation Cards */}
      <div className="space-y-0">
        {sortedRecommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            className="animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <RecommendationCard
              recommendation={recommendation}
              onExecute={onExecuteRecommendation}
              onDismiss={handleDismiss}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton for recommendations
export function RecommendationListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} padding="md">
          <div className="animate-pulse flex gap-3">
            <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-[var(--bg-tertiary)] rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-[var(--bg-tertiary)] rounded" />
              <div className="h-4 w-full bg-[var(--bg-tertiary)] rounded" />
              <div className="h-4 w-1/2 bg-[var(--bg-tertiary)] rounded" />
              <div className="flex gap-2 mt-3">
                <div className="h-8 w-24 bg-[var(--bg-tertiary)] rounded-lg" />
                <div className="h-8 w-20 bg-[var(--bg-tertiary)] rounded-lg" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
