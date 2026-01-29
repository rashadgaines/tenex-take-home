'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import { ActionItem } from '@/types';

interface EnhancedActionCardProps {
  item: ActionItem;
  onAction: (action: string, payload?: unknown) => void;
  index: number;
}

const typeIcons: Record<ActionItem['type'], React.ReactNode> = {
  scheduling_request: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  email_reply: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  conflict: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  reminder: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
};

const typeStyles: Record<ActionItem['type'], { iconColor: string; bgColor: string; borderColor: string }> = {
  scheduling_request: {
    iconColor: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  email_reply: {
    iconColor: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  conflict: {
    iconColor: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  reminder: {
    iconColor: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
};

const typeLabels: Record<ActionItem['type'], string> = {
  scheduling_request: 'Meeting Request',
  email_reply: 'Email Reply',
  conflict: 'Schedule Conflict',
  reminder: 'Reminder',
};

export function EnhancedActionCard({ item, onAction, index }: EnhancedActionCardProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const styles = typeStyles[item.type];

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onAction('dismiss', { suggestionId: item.id });
    }, 300);
  };

  return (
    <AnimatePresence>
      {!isDismissing && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: -100, scale: 0.95 }}
          transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' }}
        >
          <Card
            padding="none"
            className="mb-4 overflow-hidden group hover:shadow-lg transition-all duration-300"
            style={{
              borderLeft: `3px solid ${styles.borderColor}`,
            }}
          >
            <div className="p-5">
              <div className="flex gap-4">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: styles.bgColor }}
                >
                  <div style={{ color: styles.iconColor }}>{typeIcons[item.type]}</div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Type label */}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: styles.bgColor,
                        color: styles.iconColor,
                      }}
                    >
                      {typeLabels[item.type]}
                    </span>
                    {item.from && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        from {item.from}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-[var(--text-primary)] text-base mb-1">
                    {item.title}
                  </h4>

                  {/* Description */}
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    {item.description}
                  </p>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {item.actions.map((action, actionIndex) => (
                      <Button
                        key={action.label}
                        variant={actionIndex === 0 ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => {
                          if (action.action === 'dismiss') {
                            handleDismiss();
                          } else {
                            onAction(action.action, action.payload);
                          }
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Quick dismiss button */}
                <button
                  onClick={handleDismiss}
                  className="self-start p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
