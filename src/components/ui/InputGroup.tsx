'use client';

import {
  forwardRef,
  createContext,
  useContext,
  TextareaHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
} from 'react';

// Context for InputGroup state
interface InputGroupContextValue {
  disabled?: boolean;
}

const InputGroupContext = createContext<InputGroupContextValue>({});

// InputGroup Container
interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
}

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className = '', disabled, children, ...props }, ref) => {
    return (
      <InputGroupContext.Provider value={{ disabled }}>
        <div
          ref={ref}
          className={`
            relative flex flex-col
            bg-[var(--bg-elevated)] border border-[var(--border-light)]
            rounded-2xl shadow-2xl shadow-black/30
            transition-all duration-200
            focus-within:border-[var(--border-medium)]
            ${disabled ? 'opacity-50 pointer-events-none' : ''}
            ${className}
          `}
          {...props}
        >
          {children}
        </div>
      </InputGroupContext.Provider>
    );
  }
);
InputGroup.displayName = 'InputGroup';

// InputGroup Textarea
interface InputGroupTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const InputGroupTextarea = forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(
  ({ className = '', disabled: propDisabled, ...props }, ref) => {
    const { disabled: contextDisabled } = useContext(InputGroupContext);
    const disabled = propDisabled ?? contextDisabled;

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`
          w-full px-4 pt-4 pb-2
          bg-transparent
          text-[var(--text-primary)] text-base
          placeholder:text-[var(--text-tertiary)]
          border-none outline-none
          resize-none
          disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
    );
  }
);
InputGroupTextarea.displayName = 'InputGroupTextarea';

// InputGroup Addon (container for buttons)
interface InputGroupAddonProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'block-start' | 'block-end';
}

export const InputGroupAddon = forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className = '', align = 'block-end', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-center gap-2 px-3 pb-3
          ${align === 'block-start' ? 'pt-3 pb-0' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);
InputGroupAddon.displayName = 'InputGroupAddon';

// InputGroup Button
interface InputGroupButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
  size?: 'sm' | 'icon-sm';
}

export const InputGroupButton = forwardRef<HTMLButtonElement, InputGroupButtonProps>(
  ({ className = '', variant = 'ghost', size = 'sm', disabled: propDisabled, children, ...props }, ref) => {
    const { disabled: contextDisabled } = useContext(InputGroupContext);
    const disabled = propDisabled ?? contextDisabled;

    const variantStyles = {
      default: 'bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]',
      ghost: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-light)] hover:text-[var(--text-primary)]',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      'icon-sm': 'w-8 h-8 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center gap-1.5
          font-medium rounded-full
          transition-all duration-150
          focus-visible:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);
InputGroupButton.displayName = 'InputGroupButton';
