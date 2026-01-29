'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const MAX_CHAR_WARNING = 500;
const MAX_LINES = 4;
const LINE_HEIGHT = 24; // approximate line height in pixels

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Ask me anything about your schedule...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Calculate new height (max 4 lines)
      const maxHeight = LINE_HEIGHT * MAX_LINES;
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${Math.max(newHeight, LINE_HEIGHT)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without shift) or Cmd/Ctrl+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = disabled || isLoading;
  const showCharCount = message.length > MAX_CHAR_WARNING;

  return (
    <div className="px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          className={`
            relative bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-2xl
            shadow-sm
            ${isDisabled ? 'opacity-70' : ''}
          `}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            aria-label="Message input"
            aria-describedby="chat-input-hint"
            className={`
              w-full px-4 py-3 pr-14
              bg-transparent
              text-[var(--text-primary)] text-[15px]
              placeholder:text-[var(--text-tertiary)]
              resize-none
              focus:outline-none
              disabled:cursor-not-allowed
            `}
            style={{
              lineHeight: `${LINE_HEIGHT}px`,
              maxHeight: `${LINE_HEIGHT * MAX_LINES}px`,
            }}
          />

          {/* Bottom row: hints and send button */}
          <div className="flex items-center justify-between px-3 pb-2">
            {/* Left side: keyboard hint and character count */}
            <div className="flex items-center gap-3">
              <span id="chat-input-hint" className="text-[11px] text-[var(--text-tertiary)] hidden sm:block">
                <kbd className="px-1 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded text-[10px]">
                  Enter
                </kbd>
                {' '}to send
              </span>

              {/* Character count */}
              <AnimatePresence>
                {showCharCount && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`text-[11px] ${
                      message.length > 1000
                        ? 'text-[var(--status-warning)]'
                        : 'text-[var(--text-tertiary)]'
                    }`}
                    aria-live="polite"
                  >
                    {message.length.toLocaleString()} characters
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Send button */}
            <motion.button
              onClick={handleSubmit}
              disabled={!message.trim() || isLoading || disabled}
              aria-label={isLoading ? 'Sending message' : 'Send message'}
              aria-disabled={!message.trim() || isLoading || disabled}
              className={`
                flex items-center justify-center
                w-8 h-8 rounded-xl
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-medium)] focus-visible:ring-offset-2
                ${
                  message.trim() && !isLoading
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                }
                disabled:cursor-not-allowed
              `}
              whileTap={message.trim() && !isLoading ? { scale: 0.9 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
