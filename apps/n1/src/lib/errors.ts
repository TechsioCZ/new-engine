type ErrorWithMessage = {
  message: unknown
}

type ErrorWithStatus = {
  status: unknown
}

type ErrorWithResponse = {
  response: unknown
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

  return "An unknown error occurred"
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
  fallbackMessage = "An unknown error occurred"
): Error {
  if (error instanceof Error) {
    return error
  }

  const message = getErrorMessage(error)
  if (message === "An unknown error occurred") {
    return new Error(fallbackMessage)
  }

  return new Error(message)
}

export function isNotFoundError(error: unknown): boolean {
  const status = getErrorStatus(error)
  return status === 404
}

export function logError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, error)
  }
}

/**
 * Error codes for cart and checkout operations
 */
export type CartServiceErrorCode =
  | "CART_NOT_FOUND"
  | "CART_CREATION_FAILED"
  | "ITEM_ADD_FAILED"
  | "ITEM_UPDATE_FAILED"
  | "ITEM_REMOVE_FAILED"
  | "SHIPPING_NOT_AVAILABLE"
  | "SHIPPING_SET_FAILED"
  | "PAYMENT_INIT_FAILED"
  | "PAYMENT_FAILED"
  | "ORDER_CREATION_FAILED"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"

/**
 * Structured error for cart and checkout operations
 * Provides type-safe error codes and user-friendly messages
 */
export class CartServiceError extends Error {
  code: CartServiceErrorCode
  originalError?: unknown

  constructor(
    message: string,
    code: CartServiceErrorCode,
    originalError?: unknown
  ) {
    super(message)
    this.name = "CartServiceError"
    this.code = code
    this.originalError = originalError
  }

  /**
   * Create CartServiceError from Medusa SDK error
   */
  static fromMedusaError(
    error: unknown,
    fallbackCode: CartServiceErrorCode = "VALIDATION_ERROR"
  ): CartServiceError {
    const message = getErrorMessage(error)
    const status = getErrorStatus(error)

    // Map HTTP status to error code
    let code: CartServiceErrorCode = fallbackCode

    if (status === 404) {
      code = "CART_NOT_FOUND"
    } else if (status && status >= 500) {
      code = "NETWORK_ERROR"
    } else if (status === 400) {
      code = "VALIDATION_ERROR"
    }

    return new CartServiceError(message, code, error)
  }

  /**
   * Check if error is CartServiceError
   */
  static isCartServiceError(error: unknown): error is CartServiceError {
    return error instanceof CartServiceError
  }
}

// ============================================================================
// Address Validation Error
// ============================================================================

import type { AddressErrors } from "@/utils/address-validation"

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

  /**
   * Check if error is AddressValidationError
   */
  static isAddressValidationError(
    error: unknown
  ): error is AddressValidationError {
    return error instanceof AddressValidationError
  }
}
