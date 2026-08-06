import type { AddressErrors } from "@/utils/address-validation"

export class AddressValidationError extends Error {
  readonly code = "ADDRESS_VALIDATION_ERROR"
  readonly errors: AddressErrors

  constructor(errors: AddressErrors) {
    super("Adresa obsahuje neplatné údaje")
    this.name = "AddressValidationError"
    this.errors = errors
  }

  get firstError(): string {
    return (
      Object.values(this.errors).find(
        (message) => message !== undefined && message !== "",
      ) ?? "Neplatná adresa"
    )
  }

  get allErrors(): string {
    return Object.values(this.errors)
      .filter((message) => message !== undefined && message !== "")
      .join(", ")
  }

  static isAddressValidationError(
    error: unknown,
  ): error is AddressValidationError {
    return error instanceof AddressValidationError
  }
}
