const REVIEW_TITLE_MAX_LENGTH = 200
const GENERIC_REVIEW_SUBMIT_ERROR =
  "Recenziu sa nepodarilo odoslať. Skúste to prosím znova."
const PURCHASE_REQUIRED_REVIEW_ERROR =
  "Na napísanie recenzie musíte mať tento produkt zakúpený."
const REVIEW_VALIDATION_ERROR =
  "Skontrolujte prosím hodnotenie a text recenzie."
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
    message: "Vyberte prosím hodnotenie.",
  },
  {
    patterns: ["content"],
    message: "Napíšte prosím text recenzie.",
  },
  {
    patterns: ["text"],
    message: "Napíšte prosím text recenzie.",
  },
  {
    patterns: ["title"],
    message: "Skontrolujte prosím nadpis recenzie.",
  },
] as const

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

const resolveTokenMessage = (normalizedMessage: string): string | null => {
  if (normalizedMessage.includes("token has already been used")) {
    return "Tento odkaz na hodnotenie už bol použitý."
  }
  if (normalizedMessage.includes("token has expired")) {
    return "Tento odkaz na hodnotenie už expiroval."
  }
  if (normalizedMessage.includes("token does not match")) {
    return "Tento odkaz nepatrí k vybranému produktu."
  }
  if (normalizedMessage.includes("token was not found")) {
    return "Tento odkaz na hodnotenie nie je platný."
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
const resolveReviewValidationMessage = (normalizedMessage: string) =>
  REVIEW_VALIDATION_MESSAGE_RULES.find(({ patterns }) =>
    patterns.every((pattern) => normalizedMessage.includes(pattern))
  )?.message ?? REVIEW_VALIDATION_ERROR

const resolveKnownReviewErrorMessage = ({
  normalizedMessage,
  status,
}: {
  normalizedMessage: string
  status: number | undefined
}) => {
  const tokenMessage = resolveTokenMessage(normalizedMessage)
  if (tokenMessage) {
    return tokenMessage
  }

  if (status === 409) {
    return "Tento produkt ste už hodnotili."
  }

  if (status === 401) {
    return "Pre odoslanie recenzie sa prosím prihláste."
  }

  if (status === 403) {
    return "Recenziu pre tento produkt momentálne nemôžete odoslať."
  }

  if (isPurchaseRequiredReviewMessage(normalizedMessage)) {
    return PURCHASE_REQUIRED_REVIEW_ERROR
  }

  if (isDuplicateReviewError(status, normalizedMessage)) {
    return "Tento produkt ste už hodnotili."
  }

  if (status && BAD_REQUEST_REVIEW_STATUSES.has(status)) {
    return resolveReviewValidationMessage(normalizedMessage)
  }

  if (status && status >= 500) {
    return GENERIC_REVIEW_SUBMIT_ERROR
  }

  return null
}

export const resolveProductReviewSubmitErrorMessage = (error: unknown) => {
  const message = extractErrorMessage(error)
  const status =
    hasErrorShape(error) && typeof error.status === "number"
      ? error.status
      : undefined
  const normalizedMessage = message.toLowerCase()

  if (!message && status === undefined) {
    return GENERIC_REVIEW_SUBMIT_ERROR
  }

  const knownMessage = resolveKnownReviewErrorMessage({
    normalizedMessage,
    status,
  })

  return knownMessage || message || GENERIC_REVIEW_SUBMIT_ERROR
}
