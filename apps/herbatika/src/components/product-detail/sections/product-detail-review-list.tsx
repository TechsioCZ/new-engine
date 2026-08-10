"use client"

import { Rating } from "@techsio/ui-kit/atoms/rating"
import { useFormatter, useTranslations } from "next-intl"

import { ProductReviewCreateDialog } from "@/components/product-detail/sections/product-detail-review-dialog"
import { FractionalRating } from "@/components/reviews/fractional-rating"
import type { ReviewItem } from "@/components/reviews/reviews.types"

const resolveReviewInitial = (author: string) => {
  const initial = author.trim().charAt(0).toUpperCase()
  return initial === "" ? "A" : initial
}

export const ProductDetailReviewsHeader = ({
  averageRating,
  productId,
  totalCount,
}: {
  averageRating: number
  productId: string
  totalCount: number
}) => {
  const format = useFormatter()
  const tCatalog = useTranslations("catalog")
  const formattedAverageRating = format.number(averageRating, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })

  return (
    <header className="flex flex-col gap-350 lg:items-start lg:justify-between">
      <div className="space-y-100">
        <div className="flex flex-wrap items-center gap-300">
          <h2 className="font-semibold text-3xl text-fg-primary leading-tight">
            {tCatalog("reviews.product_title")}{" "}
            <span className="whitespace-nowrap">
              - <span className="text-primary">{formattedAverageRating}</span>
            </span>
          </h2>
          <FractionalRating
            label={tCatalog("reviews.rating_aria", {
              max: 5,
              rating: formattedAverageRating,
            })}
            value={averageRating}
          />
        </div>
        <p className="text-fg-secondary text-sm leading-relaxed">
          {tCatalog("reviews.based_on_count", { count: totalCount })}
        </p>
      </div>

      <ProductReviewCreateDialog productId={productId} />
    </header>
  )
}

const ProductReviewListItem = ({ review }: { review: ReviewItem }) => (
  <article className="border-border-secondary not-last:border-b p-400">
    <div className="flex gap-300">
      <div className="flex size-36 shrink-0 items-center justify-center rounded-full bg-base">
        <span className="font-normal text-2xl text-fg-secondary leading-none">
          {resolveReviewInitial(review.author)}
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

          {review.dateLabel === "" ? null : (
            <p className="shrink-0 text-fg-placeholder text-sm leading-tight">
              {review.dateLabel}
            </p>
          )}
        </header>

        <div className="space-y-150">
          <p className="text-fg-secondary text-md leading-relaxed">
            {review.message}
          </p>
        </div>
      </div>
    </div>
  </article>
)

export const ProductDetailReviewList = ({
  reviews,
}: {
  reviews: ReviewItem[]
}) => (
  <div className="space-y-300">
    {reviews.map((review) => (
      <ProductReviewListItem key={review.id} review={review} />
    ))}
  </div>
)
