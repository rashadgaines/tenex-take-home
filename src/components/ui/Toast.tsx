'use client';

import { useEffect, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'var(--status-success)',
    icon: '#22c55e',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'var(--status-error)',
    icon: '#ef4444',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'var(--status-warning)',
    icon: '#f59e0b',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.15)',
    border: '#3b82f6',
    icon: '#3b82f6',
  },
};

const icons: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10L9 12L13 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 7V10M10 13H10.01M3.07 16.5H16.93C18.14 16.5 18.91 15.17 18.31 14.12L11.38 2.37C10.78 1.32 9.22 1.32 8.62 2.37L1.69 14.12C1.09 15.17 1.86 16.5 3.07 16.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14V10M10 6H10.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export function Toast({ id, message, variant, duration = 5000, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(id);
    }, 300); // Match the transition duration
  };

  const styles = variantStyles[variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: styles.bg,
        borderLeft: `3px solid ${styles.border}`,
        boxShadow: 'var(--shadow-lg)',
        transform: isVisible && !isLeaving ? 'translateX(0)' : 'translateX(calc(100% + 24px))',
        opacity: isVisible && !isLeaving ? 1 : 0,
        transition: 'transform 300ms ease-out, opacity 300ms ease-out',
      }}
      className="pointer-events-auto flex items-start gap-3 w-full max-w-sm rounded-lg p-4 backdrop-blur-sm"
    >
      <span style={{ color: styles.icon }} className="flex-shrink-0 mt-0.5">
        {icons[variant]}
      </span>
      <p
        style={{ color: 'var(--text-primary)' }}
        className="flex-1 text-sm font-medium leading-5"
      >
        {message}
      </p>
      <button
        onClick={handleDismiss}
        style={{ color: 'var(--text-secondary)' }}
        className="flex-shrink-0 p-1 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors duration-150 focus-visible:outline-none"
        aria-label="Dismiss notification"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 4L4 12M4 4L12 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

Toast.displayName = 'Toast';
