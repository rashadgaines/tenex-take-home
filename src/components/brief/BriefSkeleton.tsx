'use client';

import { motion } from 'framer-motion';

// Shimmer animation keyframes
const shimmerAnimation = {
  initial: { backgroundPosition: '200% 0' },
  animate: {
    backgroundPosition: '-200% 0',
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: 'linear' as const,
    },
  },
};

interface SkeletonBlockProps {
  className?: string;
}

function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return (
    <motion.div
      className={`rounded-lg ${className}`}
      style={{
        background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-elevated) 50%, var(--bg-tertiary) 75%)',
        backgroundSize: '200% 100%',
      }}
      variants={shimmerAnimation}
      initial="initial"
      animate="animate"
    />
  );
}

export function BriefSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero Section Skeleton */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative mb-8 p-8 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.03) 50%, rgba(16, 185, 129, 0.02) 100%)',
        }}
      >
        <div className="space-y-4">
          {/* Date and icon */}
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-8 h-8" />
            <SkeletonBlock className="w-40 h-4" />
          </div>
          {/* Greeting */}
          <SkeletonBlock className="w-72 h-10" />
          {/* Summary */}
          <div className="space-y-2">
            <SkeletonBlock className="w-full h-5" />
            <SkeletonBlock className="w-3/4 h-5" />
          </div>
        </div>
      </motion.div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-xl p-5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <SkeletonBlock className="w-16 h-8" />
                <SkeletonBlock className="w-20 h-4" />
              </div>
              <SkeletonBlock className="w-10 h-10 rounded-lg" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeline Schedule Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-xl p-6 mb-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <SkeletonBlock className="w-36 h-6" />
            <SkeletonBlock className="w-48 h-4" />
          </div>
          <SkeletonBlock className="w-24 h-4" />
        </div>

        {/* Timeline items */}
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <SkeletonBlock className="w-3 h-3 rounded-full" />
                {i < 2 && <div className="w-0.5 flex-1 bg-[var(--border-light)] min-h-[60px]" />}
              </div>
              {/* Event card */}
              <div className="flex-1 p-4 rounded-xl bg-[var(--bg-elevated)]/50">
                <div className="flex items-start gap-3">
                  <SkeletonBlock className="w-1 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <SkeletonBlock className="w-16 h-4" />
                      <SkeletonBlock className="w-12 h-4" />
                    </div>
                    <SkeletonBlock className="w-48 h-5" />
                    <SkeletonBlock className="w-32 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Action Items Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <SkeletonBlock className="w-32 h-4 mb-4" />
        {[0, 1].map((i) => (
          <div
            key={i}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-xl p-5 mb-4"
          >
            <div className="flex gap-4">
              <SkeletonBlock className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-3">
                <SkeletonBlock className="w-24 h-4" />
                <SkeletonBlock className="w-48 h-5" />
                <SkeletonBlock className="w-full h-4" />
                <div className="flex gap-2 pt-2">
                  <SkeletonBlock className="w-24 h-8 rounded-lg" />
                  <SkeletonBlock className="w-20 h-8 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Quick Actions Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <SkeletonBlock className="w-28 h-4 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <SkeletonBlock className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="w-36 h-5" />
                  <SkeletonBlock className="w-48 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
