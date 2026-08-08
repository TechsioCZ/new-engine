import type { useTranslations } from "next-intl"

import { resolveKnownProductReviewErrorMessage } from "@/components/reviews/product-review-error-matcher"
import type { ProductReviewErrorMessages } from "@/components/reviews/product-review-error-messages"

export type { ProductReviewErrorMessages } from "@/components/reviews/product-review-error-messages"

const REVIEW_TITLE_MAX_LENGTH = 200

type CatalogTranslator = ReturnType<typeof useTranslations<"catalog">>

export const translateProductReviewErrorMessages = (
  translate: CatalogTranslator,
): ProductReviewErrorMessages => ({
  authRequired: translate("reviews.errors.auth_required"),
  contentRequired: translate("reviews.errors.content_required"),
  duplicate: translate("reviews.errors.duplicate"),
  forbidden: translate("reviews.errors.forbidden"),
  generic: translate("reviews.errors.generic"),
  purchaseRequired: translate("reviews.errors.purchase_required"),
  ratingRequired: translate("reviews.errors.rating_required"),
  titleInvalid: translate("reviews.errors.title_invalid"),
  tokenExpired: translate("reviews.errors.token_expired"),
  tokenMismatch: translate("reviews.errors.token_mismatch"),
  tokenNotFound: translate("reviews.errors.token_not_found"),
  tokenUsed: translate("reviews.errors.token_used"),
  validation: translate("reviews.errors.validation"),
})

const hasErrorShape = (
  error: unknown,
): error is { message?: unknown; status?: unknown; statusText?: unknown } =>
  error !== null && typeof error === "object"

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

export const resolveProductReviewSubmitErrorMessage = (
  error: unknown,
  messages: ProductReviewErrorMessages,
) => {
  const message = extractErrorMessage(error)
  const status =
    hasErrorShape(error) && typeof error.status === "number"
      ? error.status
      : undefined
  const normalizedMessage = message.toLowerCase()

  if (message === "" && status === undefined) {
    return messages.generic
  }

  const knownMessage = resolveKnownProductReviewErrorMessage({
    messages,
    normalizedMessage,
    status,
  })

  return knownMessage ?? messages.generic
}
