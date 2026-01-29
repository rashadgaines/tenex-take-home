'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import { Insight } from '@/types';

interface EnhancedInsightCardProps {
  insight: Insight;
  onAction: (prompt: string) => void;
  onDismiss: () => void;
}

const typeConfig: Record<Insight['type'], {
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  observation: {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    iconColor: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: '#3B82F6',
    label: 'Insight',
  },
  warning: {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    iconColor: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: '#F59E0B',
    label: 'Attention',
  },
  suggestion: {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    iconColor: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: '#8B5CF6',
    label: 'Tip',
  },
};

export function EnhancedInsightCard({ insight, onAction, onDismiss }: EnhancedInsightCardProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const config = typeConfig[insight.type];

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <AnimatePresence>
      {!isDismissing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-8"
        >
          <Card
            padding="none"
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${config.bgColor} 0%, var(--bg-tertiary) 100%)`,
            }}
          >
            {/* Decorative accent */}
            <div
              className="absolute top-0 left-0 w-1 h-full"
              style={{ backgroundColor: config.borderColor }}
            />

            <div className="p-6 pl-8">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: config.bgColor }}
                >
                  <div style={{ color: config.iconColor }}>{config.icon}</div>
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Label */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: config.iconColor }}
                    >
                      {config.label}
                    </span>
                    <div className="flex-1" />
                    {/* Dismiss button */}
                    <button
                      onClick={handleDismiss}
                      className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all"
                      aria-label="Dismiss insight"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Message */}
                  <p className="text-[var(--text-primary)] text-base leading-relaxed mb-4">
                    {insight.message}
                  </p>

                  {/* Action buttons */}
                  {insight.actionable && insight.action && (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => onAction(insight.action!.prompt)}
                        className="group"
                      >
                        {insight.action.label}
                        <svg className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={handleDismiss}
                      >
                        Maybe later
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div
              className="absolute bottom-0 right-0 w-32 h-32 opacity-5 pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, ${config.iconColor} 0%, transparent 70%)`,
              }}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
