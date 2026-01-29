'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MainCanvas, ChatInput } from '@/components/layout';
import type { ChatMessage, ChatResponse } from '@/types/ai';

// Utility function to ensure plain text rendering by escaping HTML entities
function sanitizeForPlainText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const examplePrompts = [
  'Schedule a meeting next week',
  'Block time for deep work',
  'Find availability for 3 people',
  'Plan my week ahead',
];

function PlanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const processedPromptRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

      const data: ChatResponse = await response.json();

      // Add assistant message
      setMessages((prev) => [...prev, {
        ...data.message,
        timestamp: new Date(data.message.timestamp),
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <>
      <MainCanvas>
        <div className="max-w-3xl mx-auto pb-32">
          {messages.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
                What would you like to schedule?
              </h1>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                Tell me what you need to plan and I&apos;ll help you find the right times and draft any emails.
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleExampleClick(prompt)}
                    className="p-4 text-left text-sm bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-xl hover:border-[var(--border-medium)] hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-primary)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Conversation view
            <div className="space-y-4 py-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                        : 'bg-[var(--bg-tertiary)] border border-[var(--border-light)]'
                    }`}
                  >
                    <p
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: sanitizeForPlainText(message.content) }}
                    />
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
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
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-light)] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
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
