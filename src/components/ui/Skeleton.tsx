'use client';

import { HTMLAttributes, forwardRef } from 'react';

// ============================================================================
// Base Skeleton with shimmer animation
// ============================================================================
interface SkeletonBaseProps extends HTMLAttributes<HTMLDivElement> {
  animate?: boolean;
}

const SkeletonBase = forwardRef<HTMLDivElement, SkeletonBaseProps>(
  ({ animate = true, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-[var(--bg-tertiary)]
          ${animate ? 'animate-skeleton-shimmer' : ''}
          ${className}
        `}
        style={{
          backgroundImage: animate
            ? 'linear-gradient(90deg, var(--bg-tertiary) 0%, var(--bg-elevated) 50%, var(--bg-tertiary) 100%)'
            : undefined,
          backgroundSize: '200% 100%',
        }}
        {...props}
      />
    );
  }
);

SkeletonBase.displayName = 'SkeletonBase';

// ============================================================================
// SkeletonText - Text placeholder
// ============================================================================
interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lineHeight?: 'sm' | 'md' | 'lg';
  lastLineWidth?: string;
}

const lineHeightStyles = {
  sm: 'h-3',
  md: 'h-4',
  lg: 'h-5',
};

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 1, lineHeight = 'md', lastLineWidth = '75%', className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`space-y-2 ${className}`} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase
            key={i}
            className={`${lineHeightStyles[lineHeight]} rounded`}
            style={{
              width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%',
            }}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

// ============================================================================
// SkeletonCard - Card placeholder
// ============================================================================
interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  hasHeader?: boolean;
  hasImage?: boolean;
  lines?: number;
}

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ hasHeader = true, hasImage = false, lines = 3, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-[var(--bg-tertiary)]
          border border-[var(--border-light)]
          rounded-xl p-5
          ${className}
        `}
        {...props}
      >
        {hasImage && (
          <SkeletonBase className="h-40 rounded-lg mb-4" />
        )}
        {hasHeader && (
          <div className="flex items-center gap-3 mb-4">
            <SkeletonBase className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBase className="h-4 rounded w-3/4" />
              <SkeletonBase className="h-3 rounded w-1/2" />
            </div>
          </div>
        )}
        <SkeletonText lines={lines} />
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

// ============================================================================
// SkeletonAvatar - Avatar placeholder
// ============================================================================
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface SkeletonAvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
}

const avatarSizeStyles: Record<AvatarSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const SkeletonAvatar = forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ size = 'md', className = '', ...props }, ref) => {
    return (
      <SkeletonBase
        ref={ref}
        className={`rounded-full ${avatarSizeStyles[size]} ${className}`}
        {...props}
      />
    );
  }
);

SkeletonAvatar.displayName = 'SkeletonAvatar';

// ============================================================================
// SkeletonButton - Button placeholder
// ============================================================================
type ButtonSize = 'sm' | 'md' | 'lg';

interface SkeletonButtonProps extends HTMLAttributes<HTMLDivElement> {
  size?: ButtonSize;
  width?: string;
}

const buttonSizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-11',
};

export const SkeletonButton = forwardRef<HTMLDivElement, SkeletonButtonProps>(
  ({ size = 'md', width = '100px', className = '', ...props }, ref) => {
    return (
      <SkeletonBase
        ref={ref}
        className={`rounded-lg ${buttonSizeStyles[size]} ${className}`}
        style={{ width }}
        {...props}
      />
    );
  }
);

SkeletonButton.displayName = 'SkeletonButton';

// ============================================================================
// SkeletonTable - Table placeholder
// ============================================================================
interface SkeletonTableProps extends HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
}

export const SkeletonTable = forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 4, className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`space-y-3 ${className}`} {...props}>
        {/* Header */}
        <div className="flex gap-4 pb-3 border-b border-[var(--border-light)]">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonBase key={i} className="h-4 rounded flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 py-2">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonBase key={colIndex} className="h-4 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }
);

SkeletonTable.displayName = 'SkeletonTable';
