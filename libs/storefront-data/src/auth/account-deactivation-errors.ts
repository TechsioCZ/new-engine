export type MedusaAccountDeactivationOperation = "confirm" | "request"

export type MedusaAccountDeactivationResponseField =
  | "auth_identity_deleted"
  | "customer_id"
  | "deleted"
  | "response body"
  | "sent"

export class InvalidMedusaAccountDeactivationResponseError extends Error {
  readonly code = "INVALID_MEDUSA_ACCOUNT_DEACTIVATION_RESPONSE"
  readonly field: MedusaAccountDeactivationResponseField
  readonly operation: MedusaAccountDeactivationOperation

  constructor(
    operation: MedusaAccountDeactivationOperation,
    field: MedusaAccountDeactivationResponseField,
  ) {
    super(`Medusa account deactivation ${operation} returned invalid ${field}`)
    this.name = "InvalidMedusaAccountDeactivationResponseError"
    this.field = field
    this.operation = operation
  }
}
