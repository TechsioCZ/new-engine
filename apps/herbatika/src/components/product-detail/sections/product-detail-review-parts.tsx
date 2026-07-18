import { Rating } from "@techsio/ui-kit/atoms/rating"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"

import { ProductReviewCreateDialog } from "@/components/product-detail/sections/product-detail-review-dialog"
import {
  formatReviewCount,
  formatReviewScore,
} from "@/components/product-detail/sections/product-detail-review-utils"
import { FractionalRating } from "@/components/reviews/fractional-rating"
import type { ReviewItem } from "@/components/reviews/reviews.types"

export function ProductDetailReviewsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Načítavam recenzie"
      className="space-y-500"
    >
      <section className="space-y-350">
        <div className="flex flex-col gap-250 md:flex-row md:items-center md:justify-between">
          <div className="space-y-150">
            <Skeleton.Text noOfLines={1} size="lg" />
            <Skeleton.Text noOfLines={1} size="sm" />
          </div>
          <Skeleton.Rectangle className="h-900 w-full max-w-950" />
        </div>
      </section>
      <div className="space-y-300">
        {Array.from({ length: 3 }, (_, index) => (
          <article
            className="rounded-md border border-border-secondary bg-highlight p-400"
            key={`product-review-list-skeleton-${index + 1}`}
          >
            <div className="flex gap-300">
              <Skeleton.Circle className="size-14 shrink-0" />
              <div className="min-w-0 flex-1 space-y-250">
                <Skeleton.Text noOfLines={2} size="sm" />
                <Skeleton.Text noOfLines={3} size="sm" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function ProductDetailReviewsHeader({
  averageRating,
  productId,
  totalCount,
}: {
  averageRating: number
  productId: string
  totalCount: number
}) {
  return (
    <header className="flex flex-col gap-350 lg:items-start lg:justify-between">
      <div className="space-y-100">
        <div className="flex flex-wrap items-center gap-300">
          <h2 className="font-semibold text-3xl text-fg-primary leading-tight">
            Hodnotenie produktu{" "}
            <span className="whitespace-nowrap">
              -{" "}
              <span className="text-primary">
                {formatReviewScore(averageRating)}
              </span>
            </span>
          </h2>
          <FractionalRating
            label={`Priemerné hodnotenie produktu ${formatReviewScore(averageRating)} z 5`}
            value={averageRating}
          />
        </div>
        <p className="text-fg-secondary text-sm leading-relaxed">
          Na základe {formatReviewCount(totalCount)} hodnotení
        </p>
      </div>
      <ProductReviewCreateDialog productId={productId} />
    </header>
  )
}

export function ProductReviewListItem({ review }: { review: ReviewItem }) {
  const initial = review.author.trim().charAt(0).toUpperCase() || "A"
  return (
    <article className="border-border-secondary not-last:border-b p-400">
      <div className="flex gap-300">
        <div className="flex size-36 shrink-0 items-center justify-center rounded-full bg-base">
          <span className="font-normal text-2xl text-fg-secondary leading-none">
            {initial}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-250">
          <header className="flex flex-col gap-150 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-100">
              <p className="truncate font-semibold text-fg-primary text-md leading-tight">
                {review.author}
              </p>
              <Rating
                className="pointer-events-none"
                readOnly
                size="sm"
                value={review.rating}
              />
            </div>
            {review.dateLabel ? (
              <p className="shrink-0 text-fg-placeholder text-sm leading-tight">
                {review.dateLabel}
              </p>
            ) : null}
          </header>
          <p className="text-fg-secondary text-md leading-relaxed">
            {review.message}
          </p>
        </div>
      </div>
    </article>
  )
}
