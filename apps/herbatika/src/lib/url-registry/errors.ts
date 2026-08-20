export type UrlRegistryErrorCode =
  | "INVALID_COMMAND"
  | "INVALID_REQUEST_FINGERPRINT"
  | "IDEMPOTENCY_CONFLICT"
  | "SOURCE_EVENT_CONFLICT"
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "SOURCE_IDENTITY_MISMATCH"
  | "SLUG_CONFLICT"
  | "STATIC_PATH_CONFLICT"
  | "IDENTITY_CONFLICT"
  | "EQUIVALENCE_CONFLICT"
  | "INVALID_TRANSITION"
  | "INVARIANT_VIOLATION"

export class UrlRegistryError extends Error {
  readonly code: UrlRegistryErrorCode
  readonly details: Readonly<Record<string, unknown>>

  constructor(
    code: UrlRegistryErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "UrlRegistryError"
    this.code = code
    this.details = details
  }
}

export const isUrlRegistryError = (value: unknown): value is UrlRegistryError =>
  value instanceof UrlRegistryError
