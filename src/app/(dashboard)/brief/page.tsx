'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MainCanvas } from '@/components/layout';
import { Card } from '@/components/ui';
import {
  HeroGreeting,
  QuickStatsCards,
  TimelineSchedule,
  EnhancedActionCard,
  EnhancedInsightCard,
  QuickActions,
  BriefSkeleton,
} from '@/components/brief';
import { useToast } from '@/hooks/useToast';
import type { BriefData } from '@/types/ai';
import type { CalendarEvent } from '@/types';

export default function BriefPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Fetch brief data on mount
  useEffect(() => {
    async function fetchBrief() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/ai/brief');

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch brief');
        }

        const data = await response.json();

        // Parse dates from JSON
        data.date = new Date(data.date);
        data.todaySchedule.date = new Date(data.todaySchedule.date);
        data.todaySchedule.events = data.todaySchedule.events.map((event: { start: string; end: string }) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        data.todaySchedule.availableSlots = data.todaySchedule.availableSlots.map((slot: { start: string; end: string }) => ({
          ...slot,
          start: new Date(slot.start),
          end: new Date(slot.end),
        }));

        setBriefData(data);
      } catch (err) {
        setError('Unable to load your brief. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBrief();
  }, [router]);

  // Handle action button clicks
  const handleAction = async (action: string, payload?: unknown) => {
    const payloadData = payload as { suggestionId?: string; draftId?: string } | undefined;

    switch (action) {
      case 'suggest_times':
        router.push('/plan?prompt=' + encodeURIComponent('Help me find times for a meeting'));
        break;

      case 'send_email':
        if (payloadData?.suggestionId) {
          try {
            const response = await fetch(`/api/email/suggestions/${payloadData.suggestionId}/send`, {
              method: 'POST',
            });
            if (response.ok) {
              setBriefData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  actionItems: prev.actionItems.filter(
                    (item) => !item.id.includes(payloadData.suggestionId!)
                  ),
                };
              });
              toast.success('Email sent successfully');
            } else {
              toast.error('Failed to send email. Please try again.');
            }
          } catch (err) {
            toast.error('Failed to send email. Please try again.');
          }
        }
        break;

      case 'dismiss':
        if (payloadData?.suggestionId) {
          try {
            const response = await fetch(`/api/email/suggestions/${payloadData.suggestionId}/dismiss`, {
              method: 'POST',
            });
            if (response.ok) {
              setBriefData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  actionItems: prev.actionItems.filter(
                    (item) => !item.id.includes(payloadData.suggestionId!)
                  ),
                };
              });
              toast.info('Item dismissed');
            }
          } catch (err) {
            toast.error('Failed to dismiss. Please try again.');
          }
        } else {
          // Generic dismiss for action items without suggestionId
          setBriefData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              actionItems: prev.actionItems.slice(1), // Remove first item as fallback
            };
          });
          toast.info('Item dismissed');
        }
        break;

      case 'edit':
        router.push('/plan?prompt=' + encodeURIComponent('Help me edit this email draft'));
        break;

      case 'open_chat':
        router.push('/plan');
        break;

      case 'decline':
        router.push('/plan?prompt=' + encodeURIComponent('Help me politely decline this meeting request'));
        break;

      default:
        // Unhandled action - no-op
        break;
    }
  };

  // Handle insight action clicks
  const handleInsightAction = (prompt: string) => {
    router.push('/plan?prompt=' + encodeURIComponent(prompt));
  };

  // Handle dismiss insight
  const handleDismissInsight = () => {
    setBriefData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        insight: undefined,
      };
    });
  };

  // Handle quick action: Schedule meeting
  const handleScheduleMeeting = () => {
    router.push('/plan?prompt=' + encodeURIComponent('Help me schedule a new meeting'));
  };

  // Handle quick action: Block focus time
  const handleBlockFocusTime = () => {
    router.push('/plan?prompt=' + encodeURIComponent('Block some focus time for me this week'));
  };

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    setSelectedEvent(event);
  };

  // Close modal handler
  const closeModal = useCallback(() => {
    setSelectedEvent(null);
    // Restore focus to previously focused element
    if (previouslyFocusedElement.current) {
      previouslyFocusedElement.current.focus();
    }
  }, []);

  // Focus trap and keyboard handling for modal
  useEffect(() => {
    if (!selectedEvent || !modalRef.current) return;

    // Focus the modal when it opens
    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first focusable element
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      // Focus trap
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvent, closeModal]);

  // Loading state with custom skeleton
  if (isLoading) {
    return (
      <MainCanvas>
        <BriefSkeleton />
      </MainCanvas>
    );
  }

  // Error state
  if (error || !briefData) {
    return (
      <MainCanvas>
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card padding="lg">
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--status-error)]/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Unable to load your brief
                </h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  {error || 'Something went wrong. Please try again.'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2.5 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Try again
                </button>
              </div>
            </Card>
          </motion.div>
        </div>
      </MainCanvas>
    );
  }

  // Extract user's first name from greeting
  const userName = briefData.greeting.split(' ').pop() || 'there';

  return (
    <MainCanvas>
      <div className="max-w-3xl mx-auto">
        {/* Hero Greeting Section */}
        <HeroGreeting
          userName={userName}
          date={briefData.date}
          summary={briefData.summary}
          timezone={briefData.todaySchedule.timezone}
        />

        {/* Quick Stats Cards */}
        <QuickStatsCards
          meetingCount={briefData.todaySchedule.events.length}
          meetingMinutes={briefData.todaySchedule.stats.meetingMinutes}
          focusMinutes={briefData.todaySchedule.stats.focusMinutes}
          availableMinutes={briefData.todaySchedule.stats.availableMinutes}
          actionItemCount={briefData.actionItems.length}
        />

        {/* Today's Schedule Timeline */}
        <TimelineSchedule
          events={briefData.todaySchedule.events}
          timezone={briefData.todaySchedule.timezone}
          onEventClick={handleEventClick}
        />

        {/* AI Insight Card */}
        {briefData.insight && (
          <EnhancedInsightCard
            insight={briefData.insight}
            onAction={handleInsightAction}
            onDismiss={handleDismissInsight}
          />
        )}

        {/* Action Items Section */}
        <AnimatePresence>
          {briefData.actionItems.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-8"
            >
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Action Items
                <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-[var(--bg-elevated)] rounded-full">
                  {briefData.actionItems.length}
                </span>
              </h2>
              {briefData.actionItems.map((item, index) => (
                <EnhancedActionCard
                  key={item.id}
                  item={item}
                  onAction={handleAction}
                  index={index}
                />
              ))}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <QuickActions
          onScheduleMeeting={handleScheduleMeeting}
          onBlockFocusTime={handleBlockFocusTime}
        />

        {/* Event Detail Modal (optional enhancement) */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={closeModal}
            >
              <motion.div
                ref={modalRef}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-modal-title"
              >
                <Card padding="lg">
                  <div className="flex items-start justify-between mb-4">
                    <h3 id="event-modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
                      {selectedEvent.title}
                    </h3>
                    <button
                      onClick={closeModal}
                      aria-label="Close event details"
                      className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {selectedEvent.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {selectedEvent.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>

                    {selectedEvent.location && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {selectedEvent.location}
                      </div>
                    )}

                    {selectedEvent.attendees.length > 0 && (
                      <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                        <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        <div>
                          {selectedEvent.attendees.map((a, i) => (
                            <span key={i}>
                              {a.name || a.email}
                              {i < selectedEvent.attendees.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedEvent.description && (
                      <p className="text-[var(--text-secondary)] pt-2 border-t border-[var(--border-light)]">
                        {selectedEvent.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-6">
                    {selectedEvent.meetingLink && (
                      <a
                        href={selectedEvent.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-lg font-medium text-center hover:bg-[var(--accent-hover)] transition-colors"
                      >
                        Join Meeting
                      </a>
                    )}
                    <button
                      onClick={() => {
                        router.push('/calendar');
                        closeModal();
                      }}
                      className="flex-1 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg font-medium text-center hover:bg-[var(--border-light)] transition-colors"
                    >
                      View in Calendar
                    </button>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainCanvas>
  );
}
