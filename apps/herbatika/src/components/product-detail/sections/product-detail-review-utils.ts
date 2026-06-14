import type { ReviewItem } from "@/components/reviews/reviews.types";
import type { ProductReview } from "@/lib/storefront/reviews";

export const PRODUCT_DETAIL_REVIEWS_SECTION_ID = "product-detail-reviews";
export const PRODUCT_DETAIL_REVIEWS_TAB_VALUE = "reviews";

export const formatReviewScore = (value: number) =>
  value.toLocaleString("sk-SK", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });

export const formatReviewCount = (count: number) =>
  count.toLocaleString("sk-SK");

const formatReviewDate = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
};

const resolveReviewAuthor = (review: ProductReview) => {
  const firstName = review.customer?.first_name?.trim();
  const lastName = review.customer?.last_name?.trim();
  const author = [firstName, lastName].filter(Boolean).join(" ");

  return author || "Anonymne";
};

export const toReviewItem = (review: ProductReview): ReviewItem => ({
  author: resolveReviewAuthor(review),
  dateLabel: formatReviewDate(review.created_at),
  id: review.id,
  message: review.content,
  rating: review.rating,
  title: review.title,
});
