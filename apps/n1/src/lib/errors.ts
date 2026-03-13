import { StorefrontAddressValidationError } from "@techsio/storefront-data/shared/address"
import type { AddressErrors, AddressFieldKey } from "@/utils/address-validation"

type ErrorWithMessage = {
  message: unknown
}

type ErrorWithStatus = {
  status: unknown
}

type ErrorWithResponse = {
  response: unknown
}

const UNKNOWN_ERROR_MESSAGE = "An unknown error occurred"

function isError(error: unknown): error is Error {
  return error instanceof Error
}

function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  // Check for objects with message property (Medusa SDK errors)
  if (error && typeof error === "object" && "message" in error) {
    const errorWithMessage = error as ErrorWithMessage
    if (typeof errorWithMessage.message === "string") {
      return errorWithMessage.message
    }
  }

  return UNKNOWN_ERROR_MESSAGE
}

function getErrorStatus(error: unknown): number | null {
  // Check for direct status property (Medusa SDK)
  if (error && typeof error === "object" && "status" in error) {
    const errorWithStatus = error as ErrorWithStatus
    if (typeof errorWithStatus.status === "number") {
      return errorWithStatus.status
    }
  }

  if (error && typeof error === "object" && "response" in error) {
    const errorWithResponse = error as ErrorWithResponse
    if (
      errorWithResponse.response &&
      typeof errorWithResponse.response === "object" &&
      "status" in errorWithResponse.response
    ) {
      const response = errorWithResponse.response as { status: unknown }
      if (typeof response.status === "number") {
        return response.status
      }
    }
  }

  return null
}

export function toError(
  error: unknown,
  fallbackMessage = UNKNOWN_ERROR_MESSAGE
): Error {
  if (error instanceof Error) {
    return error
  }

  const message = getErrorMessage(error)
  if (message === UNKNOWN_ERROR_MESSAGE) {
    return new Error(fallbackMessage)
  }

  return new Error(message)
}

export function isNotFoundError(error: unknown): boolean {
  const status = getErrorStatus(error)
  return status === 404
}

export function isAbortLikeError(error: unknown): boolean {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return true
  }

  if (!(error && typeof error === "object")) {
    return false
  }

  const name = "name" in error ? (error as { name?: unknown }).name : undefined
  const message =
    "message" in error ? (error as { message?: unknown }).message : undefined

  if (name === "AbortError") {
    return true
  }

  return (
    typeof message === "string" &&
    (message.includes("signal is aborted without reason") ||
      message.includes("This operation was aborted"))
  )
}

export function logError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, error)
  }
}

// ============================================================================
// Address Validation Error
// ============================================================================

/**
 * Error thrown when address validation fails
 * Used as a safety net in useCreateAddress/useUpdateAddress hooks
 */
export class AddressValidationError extends Error {
  readonly errors: AddressErrors
  readonly code = "ADDRESS_VALIDATION_ERROR"

  constructor(errors: AddressErrors) {
    super("Adresa obsahuje neplatné údaje")
    this.name = "AddressValidationError"
    this.errors = errors
  }

  /**
   * Get the first error message (useful for toast notifications)
   */
  get firstError(): string {
    const firstKey = Object.keys(this.errors)[0] as keyof AddressErrors
    return this.errors[firstKey] || "Neplatná adresa"
  }

  /**
   * Get all error messages joined
   */
  get allErrors(): string {
    return Object.values(this.errors).filter(Boolean).join(", ")
  }
}

export function toAddressValidationError(
  error: unknown
): AddressValidationError | null {
  if (error instanceof AddressValidationError) {
    return error
  }

  if (error instanceof StorefrontAddressValidationError) {
    const mappedErrors: AddressErrors = {}

    for (const issue of error.issues) {
      const field = issue.field as AddressFieldKey
      if (!mappedErrors[field] && issue.message) {
        mappedErrors[field] = issue.message
      }
    }

    if (Object.keys(mappedErrors).length > 0) {
      return new AddressValidationError(mappedErrors)
    }
  }

  return null
}
