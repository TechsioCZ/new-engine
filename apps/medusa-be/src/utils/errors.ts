import { MedusaError } from "@medusajs/framework/utils"

export interface ErrorWithOriginalThrowable extends Error {
  originalThrowable?: unknown
}

type MedusaErrorType = (typeof MedusaError.Types)[keyof typeof MedusaError.Types]

type MedusaErrorWithStatusCode = MedusaError & {
  statusCode?: number
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

export function isMedusaErrorType(
  error: unknown,
  type: MedusaErrorType
): error is MedusaError {
  return error instanceof MedusaError && error.type === type
}

export function withMedusaStatusCode(
  error: MedusaError,
  statusCode: number
): MedusaError {
  ;(error as MedusaErrorWithStatusCode).statusCode = statusCode
  return error
}

export function isMedusaInvalidDataError(
  error: unknown
): error is MedusaError {
  return isMedusaErrorType(error, MedusaError.Types.INVALID_DATA)
}

export function isMedusaInvalidData404Error(
  error: unknown
): error is MedusaError {
  if (isMedusaErrorType(error, MedusaError.Types.NOT_FOUND)) {
    return true
  }

  if (!isMedusaInvalidDataError(error)) {
    return false
  }

  return (error as MedusaErrorWithStatusCode).statusCode === 404
}
