import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserPreferences, updateUserPreferences } from '@/lib/user-preferences';
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/api/responses';
import {
  validateTimeFormat,
  validateTimezone,
  validateNumberRange,
} from '@/lib/api/validation';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const preferences = await getUserPreferences(session.user.id);
    return successResponse(preferences);
  } catch (error) {
    return internalErrorResponse('Failed to get preferences');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // Validate protected times structure if provided
    if (body.protectedTimes) {
      if (!Array.isArray(body.protectedTimes)) {
        return validationErrorResponse('protectedTimes must be an array');
      }

      for (const pt of body.protectedTimes) {
        if (!pt.start || !pt.end || !Array.isArray(pt.days)) {
          return validationErrorResponse('Invalid protected time structure. Required: start, end, days');
        }

        // Validate time format (HH:mm)
        const startValidation = validateTimeFormat(pt.start);
        if (!startValidation.valid) {
          return validationErrorResponse(startValidation.error!);
        }

        const endValidation = validateTimeFormat(pt.end);
        if (!endValidation.valid) {
          return validationErrorResponse(endValidation.error!);
        }

        // Validate days values (0-6)
        if (!pt.days.every((d: number) => d >= 0 && d <= 6)) {
          return validationErrorResponse('days must contain values between 0 (Sunday) and 6 (Saturday)');
        }
      }
    }

    // Validate working hours if provided
    if (body.workingHours) {
      const startValidation = validateTimeFormat(body.workingHours.start);
      if (!startValidation.valid) {
        return validationErrorResponse(`Invalid working hours: ${startValidation.error}`);
      }

      const endValidation = validateTimeFormat(body.workingHours.end);
      if (!endValidation.valid) {
        return validationErrorResponse(`Invalid working hours: ${endValidation.error}`);
      }
    }

    // Validate timezone if provided
    if (body.timezone) {
      const timezoneValidation = validateTimezone(body.timezone);
      if (!timezoneValidation.valid) {
        return validationErrorResponse(timezoneValidation.error!);
      }
    }

    // Validate defaultMeetingDuration if provided
    if (body.defaultMeetingDuration !== undefined) {
      const durationValidation = validateNumberRange(
        body.defaultMeetingDuration,
        'defaultMeetingDuration',
        15,
        480
      );
      if (!durationValidation.valid) {
        return validationErrorResponse(durationValidation.error!);
      }
    }

    const updated = await updateUserPreferences(session.user.id, body);
    return successResponse(updated);
  } catch (error) {
    return internalErrorResponse('Failed to update preferences');
  }
}
