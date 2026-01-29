'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MainCanvas } from '@/components/layout';
import { MessageList, ChatInput } from '@/components/chat';
import type { ChatMessage, ChatResponse } from '@/types/ai';

const examplePrompts = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Schedule a meeting',
    description: 'Find time for a 30-min sync',
    prompt: 'Schedule a 30-minute meeting for tomorrow afternoon',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Block focus time',
    description: 'Protect time for deep work',
    prompt: 'Block 2 hours of focus time tomorrow morning',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Find availability',
    description: 'Check your free time slots',
    prompt: 'Show my availability for the next week',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Plan my week',
    description: 'Get a weekly overview',
    prompt: 'Help me plan my week ahead',
  },
];

const CHAT_HISTORY_KEY = 'tenex-chat-history';

function PlanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const processedPromptRef = useRef(false);
  const initialLoadRef = useRef(false);
  const [user, setUser] = useState<{ name: string; email: string; image?: string | null } | null>(null);

  // Fetch user info
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/user');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        // User fetch failed - continue with default name
      }
    }
    fetchUser();
  }, []);

  // Restore chat history from localStorage on mount
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Restore messages with proper Date objects
        const restored = parsed.map((msg: ChatMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(restored);
      }
    } catch (error) {
      // Failed to restore chat history - start fresh
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (error) {
        // Failed to save chat history - continue without persistence
      }
    }
  }, [messages]);

  // Handle pre-filled prompt from URL
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt && !processedPromptRef.current) {
      processedPromptRef.current = true;
      // Clear the URL parameter
      router.replace('/plan', { scroll: false });
      // Send the prompt
      handleSend(prompt);
    }
  }, [searchParams, router]);

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: {
            currentView: 'plan',
            conversationHistory: messages,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to get response');
      }

      const responseData = await response.json();
      const data: ChatResponse = responseData.data ?? responseData;

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          ...data.message,
          timestamp: new Date(data.message.timestamp),
        },
      ]);
    } catch (error) {
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (prompt: string) => {
    handleSend(prompt);
  };

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  return (
    <>
      <MainCanvas
        headerAction={
          messages.length > 0 ? (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              New Chat
            </button>
          ) : undefined
        }
      >
        <div className="max-w-3xl mx-auto h-full flex flex-col pb-32">
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              // Empty state with suggestions
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center py-16 px-4"
              >
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-light)]"
                >
                  <svg
                    className="w-8 h-8 text-[var(--text-secondary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="text-2xl font-semibold text-[var(--text-primary)] mb-2"
                >
                  What would you like to schedule?
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-[var(--text-secondary)] mb-10 max-w-md mx-auto"
                >
                  Tell me what you need to plan and I&apos;ll help you find the right times and
                  draft any emails.
                </motion.p>

                {/* Suggestion cards */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto"
                >
                  {examplePrompts.map((example, index) => (
                    <motion.button
                      key={example.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
                      onClick={() => handleExampleClick(example.prompt)}
                      className="group flex items-start gap-3 p-4 text-left bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-xl hover:border-[var(--border-medium)] hover:bg-[var(--bg-elevated)] transition-all duration-200"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                        {example.icon}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--text-primary)] mb-0.5">
                          {example.title}
                        </div>
                        <div className="text-sm text-[var(--text-tertiary)]">
                          {example.description}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>

                {/* Hint */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="mt-8 text-xs text-[var(--text-tertiary)]"
                >
                  Try asking: &quot;Schedule a team standup every Monday at 9am&quot;
                </motion.p>
              </motion.div>
            ) : (
              // Conversation view with message list
              <motion.div
                key="conversation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-h-0"
              >
                <MessageList
                  messages={messages}
                  isTyping={isLoading}
                  userName={user?.name || 'You'}
                  userImage={user?.image}
                  className="h-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MainCanvas>

      {/* Floating Chat Input */}
      <div className="fixed bottom-6 left-0 right-0 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            placeholder="What would you like to schedule?"
          />
        </div>
      </div>
    </>
  );
}

function LoadingFallback() {
  return (
    <MainCanvas>
      <div className="max-w-3xl mx-auto pb-32">
        <div className="text-center py-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-light)]"
          >
            <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          </motion.div>
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    </MainCanvas>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PlanPageContent />
    </Suspense>
  );
}
