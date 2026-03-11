export type StorefrontAddressScope =
  | "shipping"
  | "billing"
  | "customer"
  | "root"

export type StorefrontAddressValidationIssue = {
  scope: StorefrontAddressScope
  field: string
  code: string
  message?: string
}

export type StorefrontAddressValidationResult =
  | readonly StorefrontAddressValidationIssue[]
  | null
  | undefined

const formatValidationIssue = (
  issue: StorefrontAddressValidationIssue
): string => {
  if (issue.message) {
    return issue.message
  }

  const field = issue.field ? `${issue.field}: ` : ""
  return `${issue.scope} ${field}${issue.code}`.trim()
}

export const hasStorefrontAddressValidationIssues = (
  result: StorefrontAddressValidationResult
): result is readonly StorefrontAddressValidationIssue[] =>
  Array.isArray(result) && result.length > 0

export const getStorefrontAddressValidationMessage = (
  result: StorefrontAddressValidationResult,
  fallbackMessage = "Address validation failed"
): string => {
  if (!hasStorefrontAddressValidationIssues(result)) {
    return fallbackMessage
  }

  return result.map(formatValidationIssue).join(", ")
}

export class StorefrontAddressValidationError extends Error {
  readonly issues: StorefrontAddressValidationIssue[]

  constructor(
    issues: readonly StorefrontAddressValidationIssue[],
    message?: string
  ) {
    super(
      message ??
        getStorefrontAddressValidationMessage(issues, "Address validation failed")
    )
    this.name = "StorefrontAddressValidationError"
    this.issues = [...issues]
  }
}

export const toStorefrontAddressValidationError = (
  result: StorefrontAddressValidationResult,
  fallbackMessage?: string
): StorefrontAddressValidationError | null => {
  if (!hasStorefrontAddressValidationIssues(result)) {
    return null
  }

  return new StorefrontAddressValidationError(
    result,
    fallbackMessage ??
      getStorefrontAddressValidationMessage(result, "Address validation failed")
  )
}

export const assertStorefrontAddressValidation = (
  result: StorefrontAddressValidationResult,
  fallbackMessage?: string
): void => {
  const error = toStorefrontAddressValidationError(result, fallbackMessage)
  if (error) {
    throw error
  }
}

export type StorefrontCartAddressContext = {
  scope: "shipping" | "billing"
}

export type StorefrontCartAddressAdapter<
  TInput,
  TPayload = TInput,
  TStoredAddress = unknown,
> = {
  normalize?: (input: TInput, context: StorefrontCartAddressContext) => TInput
  validate?: (
    input: TInput,
    context: StorefrontCartAddressContext
  ) => StorefrontAddressValidationResult
  toPayload?: (input: TInput, context: StorefrontCartAddressContext) => TPayload
  fromAddress?: (
    input?: TStoredAddress | null,
    context?: StorefrontCartAddressContext
  ) => TInput
}

export type StorefrontCustomerCreateAddressContext = {
  mode: "create"
}

export type StorefrontCustomerUpdateAddressContext<TStoredAddress = unknown> = {
  mode: "update"
  address?: TStoredAddress | null
}

export type StorefrontCustomerAddressAdapter<
  TCreateInput,
  TCreateParams = TCreateInput,
  TUpdateInput = TCreateInput,
  TUpdateParams = TCreateParams,
  TStoredAddress = unknown,
> = {
  normalizeCreate?: (
    input: TCreateInput,
    context: StorefrontCustomerCreateAddressContext
  ) => TCreateInput
  validateCreate?: (
    input: TCreateInput,
    context: StorefrontCustomerCreateAddressContext
  ) => StorefrontAddressValidationResult
  toCreateParams?: (
    input: TCreateInput,
    context: StorefrontCustomerCreateAddressContext
  ) => TCreateParams
  normalizeUpdate?: (
    input: TUpdateInput,
    context: StorefrontCustomerUpdateAddressContext<TStoredAddress>
  ) => TUpdateInput
  validateUpdate?: (
    input: TUpdateInput,
    context: StorefrontCustomerUpdateAddressContext<TStoredAddress>
  ) => StorefrontAddressValidationResult
  toUpdateParams?: (
    input: TUpdateInput,
    context: StorefrontCustomerUpdateAddressContext<TStoredAddress>
  ) => TUpdateParams
  fromAddress?: (input?: TStoredAddress | null) => TCreateInput
}
