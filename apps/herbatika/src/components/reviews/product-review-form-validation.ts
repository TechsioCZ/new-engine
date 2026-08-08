export const REVIEW_CONTENT_MIN_LENGTH = 4

export interface ProductReviewFormSubmitValues {
  content: string
  rating: number
  title: string
}

export interface ProductReviewFormValues {
  content: string
  rating: number | null
}

export type ProductReviewFormErrors = Partial<
  Record<keyof ProductReviewFormValues, string>
>

export const DEFAULT_PRODUCT_REVIEW_FORM_VALUES: ProductReviewFormValues = {
  content: "",
  rating: null,
}

export const validateProductReviewForm = (
  values: ProductReviewFormValues,
  messages: {
    contentMinLength: string
    ratingRequired: string
  },
): ProductReviewFormErrors => {
  const errors: ProductReviewFormErrors = {}

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

  return errors
}
