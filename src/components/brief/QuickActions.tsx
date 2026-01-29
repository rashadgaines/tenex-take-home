'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card } from '@/components/ui';

interface QuickActionsProps {
  onScheduleMeeting: () => void;
  onBlockFocusTime: () => void;
}

const actionItems = [
  {
    id: 'schedule',
    label: 'Schedule a meeting',
    description: 'Find the best time with AI',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    action: 'schedule' as const,
  },
  {
    id: 'focus',
    label: 'Block focus time',
    description: 'Protect time for deep work',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    action: 'focus' as const,
  },
];

export function QuickActions({ onScheduleMeeting, onBlockFocusTime }: QuickActionsProps) {
  const handleAction = (action: 'schedule' | 'focus') => {
    if (action === 'schedule') {
      onScheduleMeeting();
    } else {
      onBlockFocusTime();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="mb-8"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Quick Actions
        </h2>
        <Link
          href="/calendar"
          className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
        >
          View full calendar
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actionItems.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
            onClick={() => handleAction(item.action)}
            className="text-left w-full"
          >
            <Card
              padding="md"
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-[var(--border-medium)]"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: item.bgColor }}
                >
                  <div style={{ color: item.color }}>{item.icon}</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Card>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
