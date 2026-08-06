import { resolveErrorMessage, resolveErrorStatus } from "@/lib/errors"

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
  | "INSUFFICIENT_INVENTORY"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"

const resolveCartServiceErrorCode = (
  status: number | null,
  fallbackCode: CartServiceErrorCode,
): CartServiceErrorCode => {
  if (status === 404) {
    return "CART_NOT_FOUND"
  }
  if (status !== null && status >= 500) {
    return "NETWORK_ERROR"
  }
  return status === 400 ? "VALIDATION_ERROR" : fallbackCode
}

export class CartServiceError extends Error {
  readonly code: CartServiceErrorCode
  readonly originalError?: unknown

  constructor(
    message: string,
    code: CartServiceErrorCode,
    originalError?: unknown,
  ) {
    super(message)
    this.name = "CartServiceError"
    this.code = code
    this.originalError = originalError
  }

  static fromMedusaError(
    error: unknown,
    fallbackCode: CartServiceErrorCode = "VALIDATION_ERROR",
  ): CartServiceError {
    const message = resolveErrorMessage(error)
    const status = resolveErrorStatus(error)
    const code = resolveCartServiceErrorCode(status, fallbackCode)
    return new CartServiceError(message, code, error)
  }

  static isCartServiceError(error: unknown): error is CartServiceError {
    return error instanceof CartServiceError
  }
}
