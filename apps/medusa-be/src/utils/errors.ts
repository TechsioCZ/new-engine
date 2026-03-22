import { MedusaError } from "@medusajs/framework/utils"

export interface ErrorWithOriginalThrowable extends Error {
  originalThrowable?: unknown
}

// MedusaError types that should NOT be captured in Sentry (pure client errors)
// Note: CONFLICT, DUPLICATE_ERROR, and PAYMENT_AUTHORIZATION_ERROR are intentionally
// excluded as they may indicate infrastructure or integration issues worth tracking
const CLIENT_ERROR_TYPES = new Set([
  MedusaError.Types.UNAUTHORIZED,
  MedusaError.Types.NOT_ALLOWED,
  MedusaError.Types.INVALID_DATA,
  MedusaError.Types.NOT_FOUND,
])

export function normalizeError(throwable: unknown): Error {
  if (throwable instanceof Error) {
    return throwable
  }
  const error: ErrorWithOriginalThrowable = new Error(String(throwable))
  error.originalThrowable = throwable
  return error
}

export function shouldCaptureException(error: unknown): boolean {
  if (error instanceof MedusaError) {
    return !CLIENT_ERROR_TYPES.has(error.type)
  }

  return true
}
