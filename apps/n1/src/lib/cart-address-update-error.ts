export type CartAddressUpdateErrorCode =
  | "BILLING_ADDRESS_INVALID"
  | "ADDRESS_UPDATE_REJECTED"

export class CartAddressUpdateError extends Error {
  readonly code: CartAddressUpdateErrorCode
  readonly originalError?: unknown

  constructor(
    message: string,
    code: CartAddressUpdateErrorCode,
    originalError?: unknown,
  ) {
    super(message)
    this.name = "CartAddressUpdateError"
    this.code = code
    this.originalError = originalError
  }

  static isCartAddressUpdateError(
    error: unknown,
  ): error is CartAddressUpdateError {
    return error instanceof CartAddressUpdateError
  }
}
