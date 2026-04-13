import { StorefrontAddressValidationError } from "@techsio/storefront-data/shared/address"
import { getErrorStatus } from "@techsio/storefront-data/shared/medusa-errors"
import type { AddressErrors, AddressFieldKey } from "@/utils/address-validation"

type ErrorWithMessage = {
  message: unknown
}

const UNKNOWN_ERROR_MESSAGE = "An unknown error occurred"
const ADDRESS_FIELD_KEYS: Record<AddressFieldKey, true> = {
  first_name: true,
  last_name: true,
  company: true,
  address_1: true,
  address_2: true,
  city: true,
  province: true,
  postal_code: true,
  country_code: true,
  phone: true,
}

function isAddressFieldKey(field: string): field is AddressFieldKey {
  return Object.hasOwn(ADDRESS_FIELD_KEYS, field)
}

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
      if (!(issue.message && isAddressFieldKey(issue.field))) {
        continue
      }

      const field = issue.field
      if (!mappedErrors[field]) {
        mappedErrors[field] = issue.message
      }
    }

    if (Object.keys(mappedErrors).length > 0) {
      return new AddressValidationError(mappedErrors)
    }
  }

  return null
}
