/**
 * Validation helper functions for API routes.
 */

/**
 * Validation result type returned by all validation functions.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that a required field is present and not empty.
 */
export function validateRequired(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  return { valid: true };
}

/**
 * Validates that a value is a valid email address.
 */
export function validateEmail(email: unknown): ValidationResult {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: `Invalid email address: ${email}` };
  }

  return { valid: true };
}

/**
 * Validates that a date range is valid (start before end, valid date formats).
 */
export function validateDateRange(
  start: unknown,
  end: unknown
): ValidationResult {
  // Check if values are provided
  if (!start || !end) {
    return { valid: false, error: 'Start and end dates are required' };
  }

  // Parse dates
  const startDate = new Date(start as string | number | Date);
  const endDate = new Date(end as string | number | Date);

  // Check for invalid dates
  if (isNaN(startDate.getTime())) {
    return { valid: false, error: 'Invalid start date format. Use ISO 8601 format.' };
  }

  if (isNaN(endDate.getTime())) {
    return { valid: false, error: 'Invalid end date format. Use ISO 8601 format.' };
  }

  // Check that start is before end
  if (startDate >= endDate) {
    return { valid: false, error: 'Start date must be before end date' };
  }

  return { valid: true };
}

/**
 * Validates time format (HH:mm).
 */
export function validateTimeFormat(time: unknown): ValidationResult {
  if (typeof time !== 'string') {
    return { valid: false, error: 'Time must be a string' };
  }

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return { valid: false, error: 'Invalid time format. Use HH:mm format.' };
  }

  return { valid: true };
}

/**
 * Validates a timezone string.
 */
export function validateTimezone(timezone: unknown): ValidationResult {
  if (typeof timezone !== 'string') {
    return { valid: false, error: 'Timezone must be a string' };
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid timezone' };
  }
}

/**
 * Validates an array of email addresses.
 */
export function validateEmailArray(emails: unknown, fieldName = 'Emails'): ValidationResult {
  if (!Array.isArray(emails)) {
    return { valid: false, error: `${fieldName} must be an array` };
  }

  for (const email of emails) {
    const result = validateEmail(email);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Validates that a number is within a specified range.
 */
export function validateNumberRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): ValidationResult {
  if (typeof value !== 'number') {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (value < min || value > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }

  return { valid: true };
}

/**
 * Combines multiple validation results into one.
 * Returns the first error found, or success if all validations pass.
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}
