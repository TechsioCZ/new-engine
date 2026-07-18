import type { Review, ReviewStatus } from "../../lib/reviews"

export const REVIEW_STATUS_BADGE_COLOR: Record<
  ReviewStatus,
  "green" | "orange" | "red"
> = {
  approved: "green",
  pending: "orange",
  rejected: "red",
}

export function formatReviewDate(date: string | undefined): string {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

export function getReviewCustomerName(review: Review): string {
  const name = [review.first_name, review.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  return name || review.customer_id
}
