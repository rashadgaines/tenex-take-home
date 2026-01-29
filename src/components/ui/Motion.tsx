'use client';

import { motion, HTMLMotionProps, Variants, type Easing } from 'framer-motion';
import { ReactNode, Children, forwardRef } from 'react';

// Subtle, professional timing following Apple/Linear design principles
const easing: Easing = [0.25, 0.1, 0.25, 1]; // Smooth ease-out
const springConfig = { type: 'spring' as const, stiffness: 400, damping: 30 };

// ============================================================================
// FadeIn - Simple fade in on mount
// ============================================================================
interface FadeInProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, delay = 0, duration = 0.3, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration, delay, ease: easing }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

FadeIn.displayName = 'FadeIn';

// ============================================================================
// SlideIn - Slides in from a direction
// ============================================================================
type SlideDirection = 'up' | 'down' | 'left' | 'right';

interface SlideInProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  direction?: SlideDirection;
  delay?: number;
  duration?: number;
  distance?: number;
}

const slideOffsets: Record<SlideDirection, { x: number; y: number }> = {
  up: { x: 0, y: 20 },
  down: { x: 0, y: -20 },
  left: { x: 20, y: 0 },
  right: { x: -20, y: 0 },
};

export const SlideIn = forwardRef<HTMLDivElement, SlideInProps>(
  ({ children, direction = 'up', delay = 0, duration = 0.4, distance, ...props }, ref) => {
    const offset = slideOffsets[direction];
    const multiplier = distance ? distance / 20 : 1;

    return (
      <motion.div
        ref={ref}
        initial={{
          opacity: 0,
          x: offset.x * multiplier,
          y: offset.y * multiplier
        }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{
          opacity: 0,
          x: offset.x * multiplier,
          y: offset.y * multiplier
        }}
        transition={{ duration, delay, ease: easing }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

SlideIn.displayName = 'SlideIn';

// ============================================================================
// ScaleIn - Scales in from smaller size
// ============================================================================
interface ScaleInProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  initialScale?: number;
}

export const ScaleIn = forwardRef<HTMLDivElement, ScaleInProps>(
  ({ children, delay = 0, duration = 0.3, initialScale = 0.95, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: initialScale }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: initialScale }}
        transition={{ duration, delay, ...springConfig }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

ScaleIn.displayName = 'ScaleIn';

// ============================================================================
// StaggerContainer - Container for staggered children animations
// ============================================================================
interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
};

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, staggerDelay = 0.05, delayChildren = 0, ...props }, ref) => {
    const variants: Variants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
          delayChildren,
        },
      },
    };

    return (
      <motion.div
        ref={ref}
        variants={variants}
        initial="hidden"
        animate="visible"
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

StaggerContainer.displayName = 'StaggerContainer';

// ============================================================================
// StaggerItem - Child item for StaggerContainer
// ============================================================================
interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easing },
  },
};

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.div ref={ref} variants={itemVariants} {...props}>
        {children}
      </motion.div>
    );
  }
);

StaggerItem.displayName = 'StaggerItem';

// ============================================================================
// AnimatedList - List with automatic item animations
// ============================================================================
interface AnimatedListProps extends HTMLMotionProps<'ul'> {
  children: ReactNode;
  staggerDelay?: number;
}

export const AnimatedList = forwardRef<HTMLUListElement, AnimatedListProps>(
  ({ children, staggerDelay = 0.05, ...props }, ref) => {
    const listVariants: Variants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    };

    return (
      <motion.ul
        ref={ref}
        variants={listVariants}
        initial="hidden"
        animate="visible"
        {...props}
      >
        {children}
      </motion.ul>
    );
  }
);

AnimatedList.displayName = 'AnimatedList';

// ============================================================================
// AnimatedListItem - List item for AnimatedList
// ============================================================================
interface AnimatedListItemProps extends HTMLMotionProps<'li'> {
  children: ReactNode;
}

const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: easing },
  },
};

export const AnimatedListItem = forwardRef<HTMLLIElement, AnimatedListItemProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.li ref={ref} variants={listItemVariants} {...props}>
        {children}
      </motion.li>
    );
  }
);

AnimatedListItem.displayName = 'AnimatedListItem';

// ============================================================================
// AnimatedPresence wrapper (re-export for convenience)
// ============================================================================
export { AnimatePresence } from 'framer-motion';

// ============================================================================
// Utility: motion components for direct use
// ============================================================================
export { motion };
