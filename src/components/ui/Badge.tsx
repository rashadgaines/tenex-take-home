'use client';

import { HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'meeting' | 'focus' | 'personal' | 'external';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  success: 'bg-emerald-900/30 text-[var(--status-success)]',
  warning: 'bg-amber-900/30 text-[var(--status-warning)]',
  error: 'bg-red-900/30 text-[var(--status-error)]',
  meeting: 'bg-[var(--meeting-internal)] text-[var(--text-primary)]',
  focus: 'bg-[var(--meeting-focus)] text-[var(--text-primary)]',
  personal: 'bg-[var(--meeting-personal)] text-[var(--text-primary)]',
  external: 'bg-[var(--meeting-external)] text-[var(--text-primary)]',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'sm', className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center font-medium rounded-full
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
