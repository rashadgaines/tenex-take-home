'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui';

interface QuickStatsCardsProps {
  meetingCount: number;
  meetingMinutes: number;
  focusMinutes: number;
  availableMinutes: number;
  actionItemCount: number;
}

// Hook to animate counting up
function useCountUp(target: number, duration: number = 1000): number {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      // Ease out quad
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeProgress * target));

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [target, duration]);

  return count;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  unit?: string;
  label: string;
  color: string;
  delay: number;
}

function StatCard({ icon, value, unit = '', label, color, delay }: StatCardProps) {
  const animatedValue = useCountUp(value, 1200);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <Card
        padding="md"
        className="relative overflow-hidden group hover:shadow-lg transition-shadow duration-300"
      >
        {/* Subtle gradient accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1 opacity-60"
          style={{ background: color }}
        />

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-semibold text-[var(--text-primary)] tabular-nums">
                {animatedValue}
              </span>
              {unit && (
                <span className="text-lg text-[var(--text-secondary)]">{unit}</span>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center opacity-80"
            style={{ backgroundColor: `${color}20` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function QuickStatsCards({
  meetingCount,
  meetingMinutes,
  focusMinutes,
  availableMinutes,
  actionItemCount,
}: QuickStatsCardsProps) {
  const meetingHours = Math.round(meetingMinutes / 60 * 10) / 10;
  const focusHours = Math.round(focusMinutes / 60 * 10) / 10;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        }
        value={meetingCount}
        label="Events today"
        color="#3B82F6"
        delay={0}
      />

      <StatCard
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        value={meetingHours}
        unit="h"
        label="In meetings"
        color="#F59E0B"
        delay={0.1}
      />

      <StatCard
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        }
        value={focusHours || Math.round(availableMinutes / 60 * 10) / 10}
        unit="h"
        label="Focus time"
        color="#10B981"
        delay={0.2}
      />

      <StatCard
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        value={actionItemCount}
        label="Action items"
        color="#8B5CF6"
        delay={0.3}
      />
    </div>
  );
}
