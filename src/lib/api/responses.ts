import { NextResponse } from 'next/server';

/**
 * Standard API response interface for consistent response formats across all API routes.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Standard error codes used across API routes.
 */
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Creates a standardized success response.
 * The data is accessible at response.data for consistency.
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Creates a standardized error response.
 */
export function errorResponse(
  code: ErrorCode | string,
  message: string,
  status = 400
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

/**
 * Convenience function for unauthorized errors.
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse<ApiResponse<never>> {
  return errorResponse(ErrorCodes.UNAUTHORIZED, message, 401);
}

/**
 * Convenience function for forbidden errors.
 */
export function forbiddenResponse(message = 'Access denied'): NextResponse<ApiResponse<never>> {
  return errorResponse(ErrorCodes.FORBIDDEN, message, 403);
}

/**
 * Convenience function for not found errors.
 */
export function notFoundResponse(message = 'Resource not found'): NextResponse<ApiResponse<never>> {
  return errorResponse(ErrorCodes.NOT_FOUND, message, 404);
}

/**
 * Convenience function for validation errors.
 */
export function validationErrorResponse(message: string): NextResponse<ApiResponse<never>> {
  return errorResponse(ErrorCodes.VALIDATION_ERROR, message, 400);
}

/**
 * Convenience function for rate limited errors.
 */
export function rateLimitedResponse(message = 'Too many requests. Please try again later.'): NextResponse<ApiResponse<never>> {
  return errorResponse(ErrorCodes.RATE_LIMITED, message, 429);
}

/**
 * Convenience function for internal errors.
 */
export function internalErrorResponse(message = 'An internal error occurred'): NextResponse<ApiResponse<never>> {
  return errorResponse(ErrorCodes.INTERNAL_ERROR, message, 500);
}

/**
 * Convenience function for external service errors.
 */
export function externalServiceErrorResponse(message = 'External service unavailable'): NextResponse<ApiResponse<never>> {
  return errorResponse(ErrorCodes.EXTERNAL_SERVICE_ERROR, message, 503);
}

/**
 * Helper to categorize errors and return appropriate response.
 * Useful for catch blocks in API routes.
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  // Authentication / authorization errors
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('Authentication')) {
    return unauthorizedResponse('Authentication failed');
  }

  if (errorMessage.includes('permissions') || errorMessage.includes('access denied')) {
    return forbiddenResponse('Access denied. Please check permissions.');
  }

  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('quota')) {
    return rateLimitedResponse('Service temporarily unavailable due to high demand');
  }

  // External service errors (API keys, config issues)
  if (
    errorMessage.includes('OPENAI_API_KEY') ||
    errorMessage.includes('invalid_api_key') ||
    errorMessage.includes('401')
  ) {
    return externalServiceErrorResponse('AI service not configured properly. Please contact support.');
  }

  // Default to internal error
  return internalErrorResponse(`Request failed: ${errorMessage}`);
}
