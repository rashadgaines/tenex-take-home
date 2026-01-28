'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2
            bg-[var(--bg-tertiary)] border rounded-lg
            text-[var(--text-primary)]
            placeholder:text-[var(--text-tertiary)]
            transition-colors duration-150
            focus:outline-none focus:border-[var(--border-medium)]
            disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed
            ${error ? 'border-[var(--status-error)]' : 'border-[var(--border-medium)]'}
            ${className}
          `}
          {...props}
        />
        {(error || hint) && (
          <p className={`mt-1.5 text-sm ${error ? 'text-[var(--status-error)]' : 'text-[var(--text-secondary)]'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2
            bg-[var(--bg-tertiary)] border rounded-lg
            text-[var(--text-primary)]
            placeholder:text-[var(--text-tertiary)]
            transition-colors duration-150
            resize-none
            focus:outline-none focus:border-[var(--border-medium)]
            disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed
            ${error ? 'border-[var(--status-error)]' : 'border-[var(--border-medium)]'}
            ${className}
          `}
          {...props}
        />
        {(error || hint) && (
          <p className={`mt-1.5 text-sm ${error ? 'text-[var(--status-error)]' : 'text-[var(--text-secondary)]'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
