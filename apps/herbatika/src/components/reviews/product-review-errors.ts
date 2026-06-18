const REVIEW_TITLE_MAX_LENGTH = 200
const GENERIC_REVIEW_SUBMIT_ERROR =
  "Recenziu sa nepodarilo odoslať. Skúste to prosím znova."
const PURCHASE_REQUIRED_REVIEW_ERROR =
  "Na napísanie recenzie musíte mať tento produkt zakúpený."

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

const isDuplicateReviewError = (
  status: number | undefined,
  normalizedMessage: string
) =>
  status === 409 ||
  normalizedMessage.includes("already") ||
  normalizedMessage.includes("duplicate") ||
  normalizedMessage.includes("exist") ||
  normalizedMessage.includes("reviewed")

const resolveStatusReviewMessage = (
  status: number | undefined,
  message: string
) => {
  if (status === 401) {
    return "Pre odoslanie recenzie sa prosím prihláste."
  }

  if (status === 403) {
    return "Recenziu pre tento produkt momentálne nemôžete odoslať."
  }

  if (status === 400 || status === 422) {
    return message || "Skontrolujte prosím hodnotenie a text recenzie."
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

  const tokenMessage = resolveTokenMessage(normalizedMessage)
  if (tokenMessage) {
    return tokenMessage
  }

  if (isDuplicateReviewError(status, normalizedMessage)) {
    return "Tento produkt ste už hodnotili."
  }

  if (isPurchaseRequiredReviewMessage(normalizedMessage)) {
    return PURCHASE_REQUIRED_REVIEW_ERROR
  }

  const statusMessage = resolveStatusReviewMessage(status, message)
  if (statusMessage) {
    return statusMessage
  }

  return message || GENERIC_REVIEW_SUBMIT_ERROR
}
