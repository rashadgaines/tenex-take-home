'use client';

import { HTMLAttributes, forwardRef } from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  color?: 'accent' | 'current' | 'muted';
}

const sizeStyles: Record<SpinnerSize, { container: string; strokeWidth: number }> = {
  sm: { container: 'w-4 h-4', strokeWidth: 3 },
  md: { container: 'w-6 h-6', strokeWidth: 2.5 },
  lg: { container: 'w-8 h-8', strokeWidth: 2 },
};

const colorStyles: Record<string, string> = {
  accent: 'text-[var(--accent-primary)]',
  current: 'text-current',
  muted: 'text-[var(--text-tertiary)]',
};

export const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = 'md', color = 'accent', className = '', ...props }, ref) => {
    const { container, strokeWidth } = sizeStyles[size];

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={`${container} ${colorStyles[color]} ${className}`}
        {...props}
      >
        <svg
          className="animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeOpacity="0.2"
          />
          {/* Spinning arc */}
          <path
            d="M12 2C6.477 2 2 6.477 2 12"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

// ============================================================================
// LoadingDots - Alternative loading indicator with animated dots
// ============================================================================
interface LoadingDotsProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
}

const dotSizeStyles: Record<SpinnerSize, string> = {
  sm: 'w-1 h-1',
  md: 'w-1.5 h-1.5',
  lg: 'w-2 h-2',
};

export const LoadingDots = forwardRef<HTMLDivElement, LoadingDotsProps>(
  ({ size = 'md', className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={`flex items-center gap-1 ${className}`}
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`
              ${dotSizeStyles[size]}
              bg-[var(--accent-primary)]
              rounded-full
              animate-loading-dot
            `}
            style={{
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

LoadingDots.displayName = 'LoadingDots';

// ============================================================================
// LoadingOverlay - Full overlay with spinner
// ============================================================================
interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  visible?: boolean;
  blur?: boolean;
}

export const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ visible = true, blur = true, className = '', ...props }, ref) => {
    if (!visible) return null;

    return (
      <div
        ref={ref}
        className={`
          absolute inset-0 z-50
          flex items-center justify-center
          bg-[var(--bg-primary)]/80
          ${blur ? 'backdrop-blur-sm' : ''}
          ${className}
        `}
        {...props}
      >
        <LoadingSpinner size="lg" />
      </div>
    );
  }
);

LoadingOverlay.displayName = 'LoadingOverlay';
