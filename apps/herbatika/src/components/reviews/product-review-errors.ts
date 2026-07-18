const REVIEW_TITLE_MAX_LENGTH = 200
const BAD_REQUEST_REVIEW_STATUSES = new Set([400, 422])
// Broad duplicate keywords are skipped for validation statuses below.
const BROAD_DUPLICATE_REVIEW_MESSAGE_PATTERNS = [
  "already",
  "duplicate",
  "exist",
  "reviewed",
] as const
const DUPLICATE_REVIEW_MESSAGE_RULES = [
  ["already", "review"],
  ["already", "rated"],
  ["already", "submitted"],
  ["already", "exists"],
  ["duplicate"],
  ["review", "exists"],
  ["reviewed", "product"],
] as const
const REVIEW_VALIDATION_MESSAGE_RULES = [
  {
    patterns: ["rating"],
    messageKey: "ratingRequired",
  },
  {
    patterns: ["content"],
    messageKey: "contentRequired",
  },
  {
    patterns: ["text"],
    messageKey: "contentRequired",
  },
  {
    patterns: ["title"],
    messageKey: "titleInvalid",
  },
] as const

export type ProductReviewErrorMessages = {
  authRequired: string
  contentRequired: string
  duplicate: string
  forbidden: string
  generic: string
  purchaseRequired: string
  ratingRequired: string
  titleInvalid: string
  tokenExpired: string
  tokenMismatch: string
  tokenNotFound: string
  tokenUsed: string
  validation: string
}

const hasErrorShape = (
  error: unknown
): error is { message?: unknown; status?: unknown; statusText?: unknown } =>
  Boolean(error && typeof error === "object")

export const buildProductReviewTitle = (content: string) =>
  content.trim().slice(0, REVIEW_TITLE_MAX_LENGTH)

const extractErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return error
  }
  if (hasErrorShape(error) && typeof error.message === "string") {
    return error.message
  }
  return ""
}

const resolveTokenMessage = (
  normalizedMessage: string,
  messages: ProductReviewErrorMessages
): string | null => {
  if (normalizedMessage.includes("token has already been used")) {
    return messages.tokenUsed
  }
  if (normalizedMessage.includes("token has expired")) {
    return messages.tokenExpired
  }
  if (normalizedMessage.includes("token does not match")) {
    return messages.tokenMismatch
  }
  if (normalizedMessage.includes("token was not found")) {
    return messages.tokenNotFound
  }
  return null
}

const isPurchaseRequiredReviewMessage = (normalizedMessage: string) => {
  if (
    normalizedMessage.includes("only review products") &&
    normalizedMessage.includes("purchased")
  ) {
    return true
  }

  return (
    normalizedMessage.includes("order.payment_status") ||
    (normalizedMessage.includes("payment_status") &&
      normalizedMessage.includes("not existing property"))
  )
}

const isSpecificDuplicateReviewMessage = (normalizedMessage: string) =>
  DUPLICATE_REVIEW_MESSAGE_RULES.some((patterns) =>
    patterns.every((pattern) => normalizedMessage.includes(pattern))
  )

const isBroadDuplicateReviewMessage = (normalizedMessage: string) =>
  BROAD_DUPLICATE_REVIEW_MESSAGE_PATTERNS.some((pattern) =>
    normalizedMessage.includes(pattern)
  )

const isDuplicateReviewError = (
  status: number | undefined,
  normalizedMessage: string
) => {
  if (status === 409 || isSpecificDuplicateReviewMessage(normalizedMessage)) {
    return true
  }

  if (status && BAD_REQUEST_REVIEW_STATUSES.has(status)) {
    return false
  }

  return isBroadDuplicateReviewMessage(normalizedMessage)
}

// Multi-pattern validation rules intentionally use AND semantics.
const resolveReviewValidationMessage = (
  normalizedMessage: string,
  messages: ProductReviewErrorMessages
) => {
  const messageKey = REVIEW_VALIDATION_MESSAGE_RULES.find(({ patterns }) =>
    patterns.every((pattern) => normalizedMessage.includes(pattern))
  )?.messageKey

  return messageKey ? messages[messageKey] : messages.validation
}

const resolveKnownReviewErrorMessage = ({
  messages,
  normalizedMessage,
  status,
}: {
  messages: ProductReviewErrorMessages
  normalizedMessage: string
  status: number | undefined
}) => {
  const tokenMessage = resolveTokenMessage(normalizedMessage, messages)
  if (tokenMessage) {
    return tokenMessage
  }

  if (status === 409) {
    return messages.duplicate
  }

  if (status === 401) {
    return messages.authRequired
  }

  if (status === 403) {
    return messages.forbidden
  }

  if (isPurchaseRequiredReviewMessage(normalizedMessage)) {
    return messages.purchaseRequired
  }

  if (isDuplicateReviewError(status, normalizedMessage)) {
    return messages.duplicate
  }

  if (status && BAD_REQUEST_REVIEW_STATUSES.has(status)) {
    return resolveReviewValidationMessage(normalizedMessage, messages)
  }

  if (status && status >= 500) {
    return messages.generic
  }

  return null
}

export const resolveProductReviewSubmitErrorMessage = (
  error: unknown,
  messages: ProductReviewErrorMessages
) => {
  const message = extractErrorMessage(error)
  const status =
    hasErrorShape(error) && typeof error.status === "number"
      ? error.status
      : undefined
  const normalizedMessage = message.toLowerCase()

  if (!message && status === undefined) {
    return messages.generic
  }

  const knownMessage = resolveKnownReviewErrorMessage({
    messages,
    normalizedMessage,
    status,
  })

  return knownMessage || messages.generic
}
