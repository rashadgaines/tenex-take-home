'use client';

import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  /** Optional accessible label for the card region */
  'aria-label'?: string;
  /** Optional accessible label reference */
  'aria-labelledby'?: string;
  /** When true, adds role="region" for landmark navigation */
  asRegion?: boolean;
}

const variantStyles = {
  default: 'bg-[var(--bg-tertiary)] border border-[var(--border-light)] shadow-[var(--shadow-md)]',
  outlined: 'bg-[var(--bg-tertiary)] border border-[var(--border-medium)]',
  elevated: 'bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', hoverable = false, asRegion = false, className = '', children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        role={asRegion ? 'region' : undefined}
        className={`
          rounded-xl
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hoverable ? 'cursor-pointer' : ''}
          ${className}
        `}
        whileHover={hoverable ? {
          y: -2,
          boxShadow: 'var(--shadow-lg)',
        } : undefined}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
          duration: 0.2
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends Omit<HTMLMotionProps<'div'>, 'title'> {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  /** HTML heading level for the title */
  headingLevel?: 'h2' | 'h3' | 'h4';
  /** ID for the heading, useful for aria-labelledby on the parent Card */
  headingId?: string;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, headingLevel = 'h3', headingId, className = '', ...props }, ref) => {
    const HeadingTag = headingLevel;

    return (
      <motion.div
        ref={ref}
        className={`flex items-start justify-between mb-4 ${className}`}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        <div>
          <HeadingTag id={headingId} className="font-semibold text-[var(--text-primary)]">{title}</HeadingTag>
          {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </motion.div>
    );
  }
);

CardHeader.displayName = 'CardHeader';
