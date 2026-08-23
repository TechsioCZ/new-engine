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

const MAX_DESCRIBED_ERROR_LENGTH = 2000

const readStringField = (
  source: Record<string, unknown>,
  field: string
): string | undefined => {
  const value: unknown = source[field]
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return
}

const truncate = (value: string): string =>
  value.length > MAX_DESCRIBED_ERROR_LENGTH
    ? `${value.slice(0, MAX_DESCRIBED_ERROR_LENGTH)}…`
    : value

const stringifyThrowable = (throwable: object): string => {
  try {
    const serialized = JSON.stringify(throwable)
    if (serialized && serialized !== "{}") {
      return truncate(serialized)
    }
  } catch {
    // Circular or non-serializable payloads fall through to the generic label.
  }
  return `Non-serializable ${Object.prototype.toString.call(throwable)} throwable`
}

/**
 * Describe a non-Error throwable. Workflow engines (notably the Redis workflow
 * engine) hand MedusaErrors back as plain objects whose prototype and message
 * may be lost, so field extraction runs before any stringification and
 * `String(throwable)` is never applied to objects.
 */
const describeThrowable = (throwable: object): string => {
  const source = throwable as Record<string, unknown>
  const message = readStringField(source, "message")
  const type = readStringField(source, "type")
  const code = readStringField(source, "code")
  const labels = [type, code].filter(Boolean).join("/")

  if (message) {
    return truncate(labels ? `${message} (${labels})` : message)
  }
  if (labels) {
    return truncate(`MedusaError ${labels}: ${stringifyThrowable(throwable)}`)
  }
  return stringifyThrowable(throwable)
}

export function normalizeError(throwable: unknown): Error {
  if (throwable instanceof Error) {
    return throwable
  }
  const description =
    throwable !== null && typeof throwable === "object"
      ? describeThrowable(throwable)
      : truncate(String(throwable))
  const error: ErrorWithOriginalThrowable = new Error(description)
  error.originalThrowable = throwable
  return error
}

export function shouldCaptureException(error: unknown): boolean {
  if (error instanceof MedusaError) {
    return !CLIENT_ERROR_TYPES.has(error.type)
  }

  return true
}
