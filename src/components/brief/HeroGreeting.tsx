'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface HeroGreetingProps {
  userName: string;
  date: Date;
  summary: string;
}

function getGreetingData(): { greeting: string; icon: React.ReactNode } {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      greeting: 'Good morning',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ),
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      greeting: 'Good afternoon',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ),
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      greeting: 'Good evening',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ),
    };
  }

  return {
    greeting: 'Good night',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    ),
  };
}

export function HeroGreeting({ userName, date, summary }: HeroGreetingProps) {
  const [mounted, setMounted] = useState(false);
  const { greeting, icon } = getGreetingData();

  useEffect(() => {
    setMounted(true);
  }, []);

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative mb-8 p-8 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.06) 50%, rgba(16, 185, 129, 0.04) 100%)',
      }}
    >
      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03]">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Date and time icon */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-[var(--text-secondary)]"
          >
            {mounted ? icon : null}
          </motion.div>
          <p className="text-[var(--text-secondary)] font-medium">{formattedDate}</p>
        </div>

        {/* Main greeting */}
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-4xl font-semibold text-[var(--text-primary)] mb-4 tracking-tight"
        >
          {greeting}, {userName}
        </motion.h1>

        {/* Summary */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl"
        >
          {summary}
        </motion.p>
      </div>
    </motion.div>
  );
}
