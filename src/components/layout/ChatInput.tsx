'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/InputGroup';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const QUICK_ACTIONS = [
  'Schedule a meeting for tomorrow',
  'Block focus time this afternoon',
  'Find time to meet with Sarah',
  'Show my availability this week',
  'Reschedule my 3pm meeting',
  'Add a reminder for Friday',
];

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Ask me anything about your schedule...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (action: string) => {
    setMessage(action);
    textareaRef.current?.focus();
  };

  const handleClear = () => {
    setMessage('');
    textareaRef.current?.focus();
  };

  return (
    <div className="px-4">
      <div className="max-w-2xl mx-auto">
        <InputGroup
          disabled={isLoading}
          className="px-2 py-2"
        >
          <InputGroupTextarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="min-h-[44px] text-base"
          />

          <InputGroupAddon className="gap-2">
            {/* Clear / New */}
            <InputGroupButton
              onClick={handleClear}
              size="icon-sm"
              variant="ghost"
              title="Clear"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </InputGroupButton>

            {/* Quick Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                >
                  <svg className="w-4 h-4 text-[var(--status-warning)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="font-medium">Quick actions</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-72">
                {QUICK_ACTIONS.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => handleQuickAction(action)}
                  >
                    {action}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Keyboard shortcut hint */}
            <span className="text-xs text-[var(--text-tertiary)] hidden sm:block">
              Enter to send
            </span>

            {/* Send Button */}
            <InputGroupButton
              onClick={handleSubmit}
              disabled={!message.trim() || isLoading}
              variant="default"
              size="icon-sm"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
