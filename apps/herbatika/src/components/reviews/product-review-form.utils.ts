export const REVIEW_AUTHOR_NAME_MAX_LENGTH = 120
export const REVIEW_CONTENT_MIN_LENGTH = 4

export type ProductReviewFormValues = {
  authorName: string
  content: string
  rating: number | null
  turnstileToken: string | null
}

export type ProductReviewFormSubmitValues = {
  content: string
  name?: string
  rating: number
  turnstileToken?: string
}

export type ProductReviewFormErrors = Partial<
  Record<keyof ProductReviewFormValues, string>
>

type ProductReviewFormValidationMessages = {
  authorNameRequired: string
  captchaRequired: string
  contentMinLength: string
  ratingRequired: string
}

type ProductReviewFormValidationOptions = {
  messages: ProductReviewFormValidationMessages
  requireAuthorName: boolean
  requireTurnstile: boolean
}

const normalizeOptionalText = (value: string) => {
  const normalized = value.trim()

  return normalized || undefined
}

export const validateProductReviewForm = (
  values: ProductReviewFormValues,
  {
    messages,
    requireAuthorName,
    requireTurnstile,
  }: ProductReviewFormValidationOptions
) => {
  const errors: ProductReviewFormErrors = {}

  if (requireAuthorName && !values.authorName.trim()) {
    errors.authorName = messages.authorNameRequired
  }

  if (
    typeof values.rating !== "number" ||
    !Number.isInteger(values.rating) ||
    values.rating < 1 ||
    values.rating > 5
  ) {
    errors.rating = messages.ratingRequired
  }

  if (values.content.trim().length < REVIEW_CONTENT_MIN_LENGTH) {
    errors.content = messages.contentMinLength
  }

  if (requireTurnstile && !values.turnstileToken?.trim()) {
    errors.turnstileToken = messages.captchaRequired
  }

  return errors
}

export const createProductReviewFormSubmission = (
  values: ProductReviewFormValues & { rating: number }
): ProductReviewFormSubmitValues => {
  const name = normalizeOptionalText(values.authorName)
  const turnstileToken = values.turnstileToken
    ? normalizeOptionalText(values.turnstileToken)
    : undefined

  return {
    content: values.content.trim(),
    ...(name ? { name } : {}),
    rating: values.rating,
    ...(turnstileToken ? { turnstileToken } : {}),
  }
}
