import type { Review, ReviewStatus } from "../../lib/reviews"

export const REVIEW_STATUS_BADGE_COLOR: Record<
  ReviewStatus,
  "green" | "orange" | "red"
> = {
  approved: "green",
  pending: "orange",
  rejected: "red",
}

const reviewDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

export const formatReviewDate = (date: string | undefined): string => {
  if (date === undefined || date.length === 0) {
    return "-"
  }

  return reviewDateFormatter.format(new Date(date))
}

export const getReviewCustomerName = (review: Review): string => {
  const name = [review.first_name, review.last_name]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .trim()

  return name.length > 0 ? name : review.customer_id
}
