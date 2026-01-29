'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage as ChatMessageType, ActionButton } from '@/types/ai';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessageType[];
  isTyping?: boolean;
  userName?: string;
  userImage?: string | null;
  className?: string;
  onAction?: (action: ActionButton) => void;
}

export function MessageList({
  messages,
  isTyping = false,
  userName = 'You',
  userImage,
  className = '',
  onAction,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const lastMessageCountRef = useRef(messages.length);

  // Track new messages for animation
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const newIds = messages
        .slice(lastMessageCountRef.current)
        .map((m) => m.id);
      setNewMessageIds(new Set(newIds));

      // Clear new message flag after animation
      setTimeout(() => {
        setNewMessageIds(new Set());
      }, 300);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  // Handle scroll position
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show scroll button if user is more than 100px from bottom
    setShowScrollButton(distanceFromBottom > 100);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Only auto-scroll if user is near the bottom (within 150px)
      if (distanceFromBottom < 150 || messages.length <= 1) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, isTyping]);

  // Scroll to bottom when typing indicator appears
  useEffect(() => {
    if (isTyping && messagesEndRef.current && scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < 150) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`relative h-full ${className}`}>
      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border-medium) transparent',
        }}
        role="log"
        aria-label="Chat conversation"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="px-4 py-6">
          {/* Messages */}
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              previousMessage={index > 0 ? messages[index - 1] : undefined}
              userName={userName}
              userImage={userImage}
              isNewMessage={newMessageIds.has(message.id)}
              onAction={onAction}
            />
          ))}

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <div className="mt-4" role="status" aria-label="Assistant is typing">
                <TypingIndicator />
              </div>
            )}
          </AnimatePresence>

          {/* Scroll anchor */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-full shadow-lg hover:bg-[var(--bg-tertiary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-medium)]"
            aria-label="Scroll to new messages"
          >
            <svg
              className="w-4 h-4 text-[var(--text-secondary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            <span className="text-sm text-[var(--text-secondary)]">
              New messages
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
