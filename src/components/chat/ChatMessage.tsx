'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import type { ChatMessage as ChatMessageType } from '@/types/ai';

interface ChatMessageProps {
  message: ChatMessageType;
  previousMessage?: ChatMessageType;
  userName?: string;
  userImage?: string | null;
  isNewMessage?: boolean;
}

// Simple markdown parser - supports bold, italic, lists, and code blocks
function parseMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = '';
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for code block start/end
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLanguage = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        // End of code block
        inCodeBlock = false;
        elements.push(
          <pre
            key={key++}
            className="bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono"
          >
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Process inline formatting
    const processedLine = processInlineFormatting(line, key);
    key++;

    // Check for list items
    if (line.match(/^[\-\*]\s/)) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-2">
          <span className="text-[var(--text-tertiary)]">-</span>
          <span>{processInlineFormatting(line.slice(2), key++)}</span>
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={key++} className="flex gap-2 ml-2">
            <span className="text-[var(--text-tertiary)] min-w-[1.5em]">{match[1]}.</span>
            <span>{processInlineFormatting(match[2], key++)}</span>
          </div>
        );
      }
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <span key={key++}>
          {processedLine}
          {i < lines.length - 1 && <br />}
        </span>
      );
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre
        key={key++}
        className="bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono"
      >
        <code>{codeBlockContent.join('\n')}</code>
      </pre>
    );
  }

  return elements;
}

function processInlineFormatting(text: string, baseKey: number): React.ReactNode {
  // Process inline code, bold, and italic
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code
          key={`${baseKey}-${key++}`}
          className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded text-sm font-mono"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(
        <strong key={`${baseKey}-${key++}`} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      parts.push(
        <em key={`${baseKey}-${key++}`} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Plain text until next special character
    const nextSpecial = remaining.search(/[`*]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Unmatched special character, treat as plain text
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function formatMessageTime(date: Date): string {
  return format(date, 'h:mm a');
}

function getDateSeparator(date: Date): string | null {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d');
}

export function ChatMessage({
  message,
  previousMessage,
  userName = 'You',
  userImage,
  isNewMessage = false,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Check if we should show a date separator
  const showDateSeparator = useMemo(() => {
    if (!previousMessage) return true;
    return !isSameDay(new Date(message.timestamp), new Date(previousMessage.timestamp));
  }, [message.timestamp, previousMessage]);

  // Check if messages are grouped (consecutive from same role within 2 minutes)
  const isGrouped = useMemo(() => {
    if (!previousMessage) return false;
    if (previousMessage.role !== message.role) return false;
    const timeDiff = new Date(message.timestamp).getTime() - new Date(previousMessage.timestamp).getTime();
    return timeDiff < 2 * 60 * 1000; // 2 minutes
  }, [message, previousMessage]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Copy failed silently
    }
  };

  // Get user initials
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Date Separator */}
      {showDateSeparator && (
        <div className="flex items-center justify-center my-6">
          <div className="px-3 py-1 text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] rounded-full border border-[var(--border-light)]">
            {getDateSeparator(new Date(message.timestamp))}
          </div>
        </div>
      )}

      {/* Message */}
      <motion.div
        initial={isNewMessage ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-1' : 'mt-4'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isGrouped ? 'invisible' : ''}`}>
          {isUser ? (
            userImage ? (
              <img
                src={userImage}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
                <span className="text-xs font-medium text-[var(--bg-primary)]">
                  {userInitials}
                </span>
              </div>
            )
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-light)] flex items-center justify-center">
              <svg
                className="w-4 h-4 text-[var(--text-secondary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
          {/* Message Bubble */}
          <div
            className={`relative group rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-tr-md'
                : 'bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-tl-md'
            }`}
          >
            <div className={`text-[15px] leading-relaxed ${isAssistant ? 'text-[var(--text-primary)]' : ''}`}>
              {isAssistant ? parseMarkdown(message.content) : message.content}
            </div>

            {/* Copy button for assistant messages */}
            {isAssistant && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                onClick={handleCopy}
                className="absolute -right-2 -top-2 p-1.5 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                title="Copy message"
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-[var(--status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </motion.button>
            )}
          </div>

          {/* Timestamp */}
          {!isGrouped && (
            <span className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              {formatMessageTime(new Date(message.timestamp))}
            </span>
          )}
        </div>
      </motion.div>
    </>
  );
}
