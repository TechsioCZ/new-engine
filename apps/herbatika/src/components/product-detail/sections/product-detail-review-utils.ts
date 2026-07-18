import type { ReviewItem } from "@/components/reviews/reviews.types"
import type { ProductReview } from "@/lib/storefront/reviews"

export const PRODUCT_DETAIL_REVIEWS_SECTION_ID = "product-detail-reviews"
export const PRODUCT_DETAIL_REVIEWS_TAB_VALUE = "reviews"

const resolveReviewDate = (value?: string) => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

const resolveReviewAuthor = (
  review: ProductReview,
  anonymousLabel: string
) => {
  const firstName = review.customer?.first_name?.trim()
  const lastName = review.customer?.last_name?.trim()
  const author = [firstName, lastName].filter(Boolean).join(" ")

  return author || anonymousLabel
}

export const toReviewItem = (
  review: ProductReview,
  presentation: {
    anonymousLabel: string
    formatDate: (date: Date) => string
  }
): ReviewItem => ({
  author: resolveReviewAuthor(review, presentation.anonymousLabel),
  dateLabel: (() => {
    const date = resolveReviewDate(review.created_at)
    return date ? presentation.formatDate(date) : ""
  })(),
  id: review.id,
  message: review.content,
  rating: review.rating,
  title: review.title,
})
