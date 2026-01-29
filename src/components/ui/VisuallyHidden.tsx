'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  as?: 'span' | 'div';
}

/**
 * VisuallyHidden component for screen-reader-only text.
 * Uses the standard visually hidden CSS pattern that hides content visually
 * while keeping it accessible to screen readers.
 */
export const VisuallyHidden = forwardRef<HTMLElement, VisuallyHiddenProps>(
  ({ as: Component = 'span', children, className = '', ...props }, ref) => {
    return (
      <Component
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={ref as any}
        className={`
          absolute
          w-px
          h-px
          p-0
          -m-px
          overflow-hidden
          whitespace-nowrap
          border-0
          [clip:rect(0,0,0,0)]
          ${className}
        `}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

VisuallyHidden.displayName = 'VisuallyHidden';
