import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createEvent, declineEvent, updateEvent, getEvent, getAvailability } from '@/lib/google/calendar';
import type { UserPreferences } from '@/types/user';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const DEFAULT_PREFERENCES: UserPreferences = {
  workingHours: { start: '09:00', end: '17:00' },
  protectedTimes: [],
  defaultMeetingDuration: 30,
  timezone: DEFAULT_TIMEZONE,
};

interface ExecuteRequest {
  recommendationId: string;
  actionType: 'schedule_focus_time' | 'reschedule_meeting' | 'add_buffer' | 'decline_meeting';
  payload: {
    slot?: {
      start: string;
      end: string;
    };
    eventId?: string;
    meetingId?: string;
    bufferMinutes?: number;
    title?: string;
    description?: string;
    meetings?: Array<{
      id: string;
      title: string;
      start: string;
      end: string;
      attendees: string[];
    }>;
    workingHours?: {
      start: string;
      end: string;
    };
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ExecuteRequest = await request.json();
    const { recommendationId, actionType, payload } = body;

    if (!recommendationId || !actionType) {
      return NextResponse.json(
        { error: 'Missing required fields: recommendationId and actionType' },
        { status: 400 }
      );
    }

    // Get user preferences for timezone
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const preferences = (user?.preferences as unknown as UserPreferences) || DEFAULT_PREFERENCES;

    switch (actionType) {
      case 'schedule_focus_time': {
        if (!payload.slot) {
          return NextResponse.json(
            { error: 'Missing slot information for scheduling focus time' },
            { status: 400 }
          );
        }

        const { slot } = payload;
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        // Create a focus block event
        const event = await createEvent(session.user.id, {
          title: payload.title || 'Focus Time',
          description: payload.description || 'Protected time for deep work and focused tasks.',
          start: startDate,
          end: endDate,
          timezone: preferences.timezone,
          attendees: [],
          location: undefined,
        });

        return NextResponse.json({
          success: true,
          message: 'Focus time scheduled successfully',
          data: {
            eventId: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
          },
        });
      }

      case 'reschedule_meeting': {
        // Handle reschedule for meetings outside working hours
        const meetings = payload.meetings || [];
        const workingHours = payload.workingHours || preferences.workingHours;

        if (meetings.length === 0 && !payload.eventId) {
          return NextResponse.json({
            success: true,
            message: 'No specific meetings to reschedule. Review your calendar to find meetings outside your working hours.',
            data: {
              action: 'review_schedule',
              workingHours,
            },
          });
        }

        // If a specific event ID is provided, try to reschedule it
        if (payload.eventId) {
          try {
            // Get the current event
            const currentEvent = await getEvent(session.user.id, payload.eventId);

            if (!currentEvent) {
              return NextResponse.json({
                success: false,
                message: 'Meeting not found. It may have been deleted or cancelled.',
              }, { status: 404 });
            }

            // Calculate meeting duration
            const duration = Math.round(
              (new Date(currentEvent.end).getTime() - new Date(currentEvent.start).getTime()) / 60000
            );

            // Find a slot within working hours
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const nextWeek = new Date(tomorrow);
            nextWeek.setDate(nextWeek.getDate() + 7);

            const availableSlots = await getAvailability(
              session.user.id,
              tomorrow,
              nextWeek,
              duration,
              preferences,
              true // respect protected times
            );

            if (availableSlots.length === 0) {
              return NextResponse.json({
                success: false,
                message: 'No available slots found within your working hours. Try adjusting your protected times or working hours.',
                data: {
                  action: 'no_slots',
                  suggestions: [
                    'Review your protected time settings',
                    'Consider extending your working hours temporarily',
                    'Contact attendees to find a mutually available time',
                  ],
                },
              });
            }

            // Use the first available slot
            const newSlot = availableSlots[0];
            const newStart = new Date(newSlot.start);
            const newEnd = new Date(newStart.getTime() + duration * 60000);

            // Try to update the event
            const updatedEvent = await updateEvent(session.user.id, payload.eventId, {
              start: newStart,
              end: newEnd,
              timezone: preferences.timezone,
            });

            return NextResponse.json({
              success: true,
              message: `Meeting rescheduled to ${newStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at ${newStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}. Attendees have been notified.`,
              data: {
                action: 'rescheduled',
                eventId: updatedEvent.id,
                newStart: updatedEvent.start,
                newEnd: updatedEvent.end,
              },
            });

          } catch (rescheduleError) {
            const errorMsg = rescheduleError instanceof Error ? rescheduleError.message : 'Unknown error';

            // Check if it's a permission error (user is not the organizer)
            if (errorMsg.includes('permission') || errorMsg.includes('organizer')) {
              return NextResponse.json({
                success: false,
                message: 'You can only reschedule meetings you organize. Contact the organizer to request a new time.',
                data: {
                  action: 'contact_organizer',
                  instructions: [
                    'Reply to the meeting invite',
                    'Propose alternative times that work better for you',
                    'Use "Find a time" feature to see mutual availability',
                  ],
                },
              });
            }

            return NextResponse.json({
              success: false,
              message: errorMsg,
            }, { status: 500 });
          }
        }

        // Multiple meetings in payload - provide summary
        return NextResponse.json({
          success: true,
          message: `Found ${meetings.length} meeting(s) outside your working hours. Select individual meetings to reschedule them.`,
          data: {
            action: 'review_meetings',
            meetings: meetings.map(m => ({
              id: m.id,
              title: m.title,
              currentTime: new Date(m.start).toLocaleString(),
              issue: 'Outside working hours',
            })),
          },
        });
      }

      case 'add_buffer': {
        if (!payload.meetingId || !payload.slot) {
          return NextResponse.json(
            { error: 'Missing meeting or slot information for adding buffer' },
            { status: 400 }
          );
        }

        const bufferMinutes = payload.bufferMinutes || 15;
        const { slot } = payload;
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        // Create a buffer event
        const event = await createEvent(session.user.id, {
          title: 'Buffer Time',
          description: `${bufferMinutes}-minute buffer for preparation and transition.`,
          start: startDate,
          end: endDate,
          timezone: preferences.timezone,
          attendees: [],
          location: undefined,
        });

        return NextResponse.json({
          success: true,
          message: `${bufferMinutes}-minute buffer added successfully`,
          data: {
            eventId: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
          },
        });
      }

      case 'decline_meeting': {
        // If a specific event ID is provided, decline it directly
        if (payload.eventId) {
          try {
            await declineEvent(session.user.id, payload.eventId);

            return NextResponse.json({
              success: true,
              message: 'Meeting declined successfully. The organizer has been notified.',
              data: {
                action: 'declined',
                eventId: payload.eventId,
              },
            });
          } catch (declineError) {
            const errorMsg = declineError instanceof Error ? declineError.message : 'Unknown error';

            // If we can't decline automatically, provide manual instructions
            return NextResponse.json({
              success: false,
              message: errorMsg,
              data: {
                action: 'manual_decline',
                instructions: [
                  'Open the meeting in your calendar',
                  'Click "Decline" to indicate your response',
                  'Optionally add a message explaining your decline',
                ],
              },
            });
          }
        }

        // No specific event - provide guidance on reducing meeting load
        return NextResponse.json({
          success: true,
          message: 'Review your calendar to identify meetings you can decline. Consider declining optional meetings or those where your attendance isn\'t critical.',
          data: {
            action: 'review_meetings',
            suggestions: [
              'Look for meetings marked as "optional"',
              'Check for meetings where you\'re not a required attendee',
              'Consider declining recurring meetings that no longer serve their purpose',
              'Suggest async updates instead of synchronous meetings',
            ],
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action type: ${actionType}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('permissions') || errorMessage.includes('access')) {
      return NextResponse.json(
        { error: 'Calendar access denied. Please check permissions.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to execute recommendation. Please try again.' },
      { status: 500 }
    );
  }
}
