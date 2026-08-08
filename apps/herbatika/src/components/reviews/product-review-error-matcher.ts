import type { ProductReviewErrorMessages } from "@/components/reviews/product-review-error-messages"

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
    messageKey: "ratingRequired",
    patterns: ["rating"],
  },
  {
    messageKey: "contentRequired",
    patterns: ["content"],
  },
  {
    messageKey: "contentRequired",
    patterns: ["text"],
  },
  {
    messageKey: "titleInvalid",
    patterns: ["title"],
  },
] as const

const resolveTokenMessage = (
  normalizedMessage: string,
  messages: ProductReviewErrorMessages,
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

const matchesAllPatterns = (
  normalizedMessage: string,
  patterns: readonly string[],
) => {
  const [firstPattern, secondPattern] = patterns
  if (firstPattern === undefined) {
    return true
  }

  return (
    normalizedMessage.includes(firstPattern) &&
    (secondPattern === undefined || normalizedMessage.includes(secondPattern))
  )
}

const isSpecificDuplicateReviewMessage = (normalizedMessage: string) =>
  DUPLICATE_REVIEW_MESSAGE_RULES.some((patterns) =>
    matchesAllPatterns(normalizedMessage, patterns),
  )

const isBroadDuplicateReviewMessage = (normalizedMessage: string) =>
  BROAD_DUPLICATE_REVIEW_MESSAGE_PATTERNS.some((pattern) =>
    normalizedMessage.includes(pattern),
  )

const isDuplicateReviewError = (
  status: number | undefined,
  normalizedMessage: string,
) => {
  if (status === 409 || isSpecificDuplicateReviewMessage(normalizedMessage)) {
    return true
  }

  if (status !== undefined && BAD_REQUEST_REVIEW_STATUSES.has(status)) {
    return false
  }

  return isBroadDuplicateReviewMessage(normalizedMessage)
}

// Multi-pattern validation rules intentionally use AND semantics.
const resolveReviewValidationMessage = (
  normalizedMessage: string,
  messages: ProductReviewErrorMessages,
) => {
  const messageKey = REVIEW_VALIDATION_MESSAGE_RULES.find(({ patterns }) =>
    matchesAllPatterns(normalizedMessage, patterns),
  )?.messageKey

  return messageKey === undefined ? messages.validation : messages[messageKey]
}

export const resolveKnownProductReviewErrorMessage = ({
  messages,
  normalizedMessage,
  status,
}: {
  messages: ProductReviewErrorMessages
  normalizedMessage: string
  status: number | undefined
}) => {
  const tokenMessage = resolveTokenMessage(normalizedMessage, messages)
  if (tokenMessage !== null) {
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
  if (status !== undefined && BAD_REQUEST_REVIEW_STATUSES.has(status)) {
    return resolveReviewValidationMessage(normalizedMessage, messages)
  }
  if (status !== undefined && status >= 500) {
    return messages.generic
  }

  return null
}
