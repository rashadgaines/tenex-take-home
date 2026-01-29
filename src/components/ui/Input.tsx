'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const hasError = Boolean(error);
    const hasHint = Boolean(hint);

    // Build aria-describedby based on what's present
    const describedBy = [
      hasError ? errorId : null,
      hasHint && !hasError ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
            {required && <span className="text-[var(--status-error)] ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          required={required}
          className={`
            w-full px-3 py-2
            bg-[var(--bg-tertiary)] border rounded-lg
            text-[var(--text-primary)]
            placeholder:text-[var(--text-tertiary)]
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-[var(--border-medium)] focus:ring-offset-1
            disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed
            ${error ? 'border-[var(--status-error)]' : 'border-[var(--border-medium)]'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-[var(--status-error)]" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-[var(--text-secondary)]">
            {hint}
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
  ({ label, error, hint, className = '', id, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const hasError = Boolean(error);
    const hasHint = Boolean(hint);

    // Build aria-describedby based on what's present
    const describedBy = [
      hasError ? errorId : null,
      hasHint && !hasError ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
            {required && <span className="text-[var(--status-error)] ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          required={required}
          className={`
            w-full px-3 py-2
            bg-[var(--bg-tertiary)] border rounded-lg
            text-[var(--text-primary)]
            placeholder:text-[var(--text-tertiary)]
            transition-colors duration-150
            resize-none
            focus:outline-none focus:ring-2 focus:ring-[var(--border-medium)] focus:ring-offset-1
            disabled:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed
            ${error ? 'border-[var(--status-error)]' : 'border-[var(--border-medium)]'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-[var(--status-error)]" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-[var(--text-secondary)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
