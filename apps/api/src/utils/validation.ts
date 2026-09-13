import { AppError } from '../middleware/error.middleware.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a path parameter is a well-formed UUID.
 * Throws an AppError (400) if the value is absent or malformed.
 * This prevents malformed strings from reaching the database layer and
 * produces a clear, consistent error message for the client.
 */
export function parseUUIDParam(value: string | undefined, fieldName = 'id'): string {
  if (!value || !UUID_RE.test(value)) {
    throw new AppError(`Invalid ${fieldName}: must be a valid UUID v4`, 400);
  }
  return value;
}
