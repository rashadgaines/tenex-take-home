'use client';

import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 ${className}`}
    >
      {/* Assistant Avatar */}
      <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-light)] flex items-center justify-center flex-shrink-0">
        <svg
          className="w-4 h-4 text-[var(--text-secondary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      {/* Typing bubble */}
      <div className="bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          {/* Bouncing dots */}
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full"
              animate={{
                y: [0, -6, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: index * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>

      {/* "Tenex is thinking..." text */}
      <span className="text-xs text-[var(--text-tertiary)] ml-1">
        Tenex is thinking...
      </span>
    </motion.div>
  );
}
