'use client';

import React, {
  forwardRef,
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  HTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  cloneElement,
  isValidElement,
  ReactElement,
} from 'react';

// Context for dropdown state
interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

// DropdownMenu Root
interface DropdownMenuProps {
  children: ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

// DropdownMenu Trigger
interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: ReactNode;
}

export function DropdownMenuTrigger({ asChild, children }: DropdownMenuTriggerProps) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  const { open, setOpen } = context;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        handleClick(e);
        child.props.onClick?.(e);
      },
    });
  }

  return (
    <button
      onClick={handleClick}
      aria-expanded={open}
      aria-haspopup={true}
      type="button"
    >
      {children}
    </button>
  );
}

// DropdownMenu Content
interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
}

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className = '', align = 'start', side = 'bottom', children, ...props }, ref) => {
    const context = useContext(DropdownContext);
    if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');

    const { open, setOpen } = context;
    const contentRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
      if (!open) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };

      // Delay to avoid immediate close on trigger click
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [open, setOpen]);

    if (!open) return null;

    const alignStyles = {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    };

    const sideStyles = {
      top: 'bottom-full mb-2',
      bottom: 'top-full mt-2',
    };

    return (
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={`
          absolute z-50
          min-w-[12rem] max-h-[300px] overflow-y-auto
          bg-[var(--bg-elevated)] border border-[var(--border-light)]
          rounded-xl shadow-lg
          py-1
          ${alignStyles[align]}
          ${sideStyles[side]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

// DropdownMenu Item
type DropdownMenuItemProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const DropdownMenuItem = forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className = '', onClick, children, ...props }, ref) => {
    const context = useContext(DropdownContext);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      context?.setOpen(false);
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={`
          w-full px-3 py-2
          text-left text-sm text-[var(--text-primary)]
          hover:bg-[var(--bg-tertiary)]
          transition-colors duration-100
          cursor-pointer
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuItem.displayName = 'DropdownMenuItem';
