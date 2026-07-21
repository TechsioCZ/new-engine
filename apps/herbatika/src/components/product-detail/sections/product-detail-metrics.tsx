"use client"

import { useFormatter, useTranslations } from "next-intl"
import { ReviewSkeleton } from "@/components/loading/review-skeleton"
import {
  PRODUCT_DETAIL_REVIEWS_SECTION_ID,
  toReviewItem,
} from "@/components/product-detail/sections/product-detail-review-utils"
import { ReviewsSection } from "@/components/reviews/reviews-section"
import {
  PRODUCT_REVIEWS_PAGE_SIZE,
  useProductReviews,
} from "@/lib/storefront/reviews"

type ProductDetailMetricsProps = {
  onShowAllReviews?: () => void
  productId?: string | null
}

const PRODUCT_REVIEW_TEASER_LIMIT = 4

function ProductDetailMetricsSkeleton() {
  return (
    <section className="space-y-500 pt-750">
      <div className="grid grid-cols-1 gap-500 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: PRODUCT_REVIEW_TEASER_LIMIT }, (_, index) => (
          <ReviewSkeleton key={`product-review-teaser-skeleton-${index + 1}`} />
        ))}
      </div>
    </section>
  )
}

export function ProductDetailMetrics({
  onShowAllReviews,
  productId,
}: ProductDetailMetricsProps) {
  const format = useFormatter()
  const tCatalog = useTranslations("catalog")
  const reviewsQuery = useProductReviews({
    enabled: Boolean(productId),
    limit: PRODUCT_REVIEWS_PAGE_SIZE,
    offset: 0,
    productId: productId ?? undefined,
  })
  const reviews = reviewsQuery.reviews
    .slice(0, PRODUCT_REVIEW_TEASER_LIMIT)
    .map((review) =>
      toReviewItem(review, {
        anonymousLabel: tCatalog("reviews.anonymous"),
        formatDate: (date) =>
          format.dateTime(date, {
            day: "numeric",
            month: "numeric",
            year: "numeric",
          }),
      })
    )

  if (!productId) {
    return null
  }

  if (reviewsQuery.isLoading && reviews.length === 0) {
    return <ProductDetailMetricsSkeleton />
  }

  if (reviews.length === 0) {
    return null
  }

  return (
    <ReviewsSection
      linkHref={`#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`}
      onLinkClick={(event) => {
        if (!onShowAllReviews) {
          return
        }

        event.preventDefault()
        onShowAllReviews()
      }}
      ratingValue={reviewsQuery.summary.average_rating}
      reviews={reviews}
      scoreLabel={format.number(reviewsQuery.summary.average_rating, {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })}
      sectionClassName="space-y-500 pt-750"
      variant="product"
    />
  )
}
