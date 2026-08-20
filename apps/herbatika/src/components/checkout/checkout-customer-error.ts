type ErrorRecord = Record<string, unknown>

export type CheckoutCustomerErrorMessages = Readonly<{
  cartUnavailable: string
  insufficientInventory: string
  paymentAuthorizationFailed: string
}>

export type CheckoutErrorDiagnostic = Readonly<{
  code: string | null
  status: number | null
}>

export type CheckoutErrorContext =
  | "address"
  | "completion"
  | "payment"
  | "payment-return"
  | "shipping"

const INSUFFICIENT_INVENTORY_CODES = new Set([
  "insufficient_inventory",
  "inventory_shortage",
  "out_of_stock",
])
const CART_UNAVAILABLE_CODES = new Set([
  "cart_completed",
  "cart_expired",
  "cart_not_found",
])
const PAYMENT_AUTHORIZATION_CODES = new Set([
  "payment_authorization_error",
  "payment_authorization_failed",
  "payment_declined",
])
const PAYMENT_AUTHORIZATION_MESSAGE_PATTERNS = [
  "not authorized with the provider",
  "was not authorized",
]
const PAYMENT_ERROR_CONTEXTS = new Set<CheckoutErrorContext>([
  "completion",
  "payment",
  "payment-return",
])
const MAX_ERROR_RECORDS = 16

const asRecord = (value: unknown): ErrorRecord | null =>
  typeof value === "object" && value !== null ? (value as ErrorRecord) : null

const normalizeCode = (value: unknown) =>
  typeof value === "string" && value.trim()
    ? value.trim().toLowerCase().replaceAll("-", "_")
    : null

const candidateErrorRecords = (error: unknown) => {
  const root = asRecord(error)
  if (!root) {
    return []
  }

  const records: ErrorRecord[] = []
  const pending = [root]
  const seen = new Set<ErrorRecord>()

  while (pending.length > 0 && records.length < MAX_ERROR_RECORDS) {
    const candidate = pending.shift()
    if (!candidate || seen.has(candidate)) {
      continue
    }

    seen.add(candidate)
    records.push(candidate)

    for (const child of [
      candidate.error,
      candidate.cause,
      candidate.response,
      candidate.data,
    ]) {
      const childRecord = asRecord(child)
      if (childRecord && !seen.has(childRecord)) {
        pending.push(childRecord)
      }
    }
  }

  return records
}

const resolveErrorCode = (error: unknown) => {
  for (const candidate of candidateErrorRecords(error)) {
    const code = normalizeCode(candidate.code) ?? normalizeCode(candidate.type)
    if (code) {
      return code
    }
  }

  return null
}

const resolveErrorStatus = (error: unknown) => {
  for (const candidate of candidateErrorRecords(error)) {
    for (const value of [
      candidate.status,
      candidate.statusCode,
      candidate.status_code,
    ]) {
      if (typeof value === "number" && Number.isInteger(value)) {
        return value
      }
    }
  }

  return null
}

const resolveRawErrorMessages = (error: unknown) => {
  if (error instanceof Error) {
    return [
      error.message,
      ...candidateErrorRecords(error)
        .map((candidate) => candidate.message)
        .filter((message): message is string => typeof message === "string"),
    ]
  }

  if (typeof error === "string") {
    return [error]
  }

  return candidateErrorRecords(error)
    .map((candidate) => candidate.message)
    .filter((message): message is string => typeof message === "string")
}

const isPaymentAuthorizationFailureMessage = (error: unknown) => {
  const normalizedMessages = resolveRawErrorMessages(error).map((message) =>
    message.toLowerCase()
  )
  return normalizedMessages.some((message) =>
    PAYMENT_AUTHORIZATION_MESSAGE_PATTERNS.some((pattern) =>
      message.includes(pattern)
    )
  )
}

export const readCheckoutErrorDiagnostic = (
  error: unknown
): CheckoutErrorDiagnostic => ({
  code: resolveErrorCode(error),
  status: resolveErrorStatus(error),
})

export const resolveCheckoutCustomerErrorMessage = (
  error: unknown,
  fallbackMessage: string,
  messages: CheckoutCustomerErrorMessages,
  context: CheckoutErrorContext
) => {
  const code = resolveErrorCode(error)

  if (code && INSUFFICIENT_INVENTORY_CODES.has(code)) {
    return messages.insufficientInventory
  }

  if (code && CART_UNAVAILABLE_CODES.has(code)) {
    return messages.cartUnavailable
  }

  if (
    (code && PAYMENT_AUTHORIZATION_CODES.has(code)) ||
    (PAYMENT_ERROR_CONTEXTS.has(context) &&
      isPaymentAuthorizationFailureMessage(error))
  ) {
    return messages.paymentAuthorizationFailed
  }

  return fallbackMessage
}

export const reportCheckoutError = (operation: string, error: unknown) => {
  console.error(`Checkout ${operation} failed`, {
    ...readCheckoutErrorDiagnostic(error),
    error,
  })
}
