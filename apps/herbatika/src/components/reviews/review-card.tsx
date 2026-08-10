import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Rating } from "@techsio/ui-kit/atoms/rating"
import type { StaticImageData } from "next/image"
import NextImage from "next/image"

import type { ReviewItem } from "@/components/reviews/reviews.types"

export type ReviewsVariant = "product" | "homepage"

interface ReviewCardProps {
  review: ReviewItem
  sourceBadge: StaticImageData
  sourceBadgeAlt: string
  variant: ReviewsVariant
  verifiedPurchaseLabel: string
}

const resolveReviewInitial = (author: string): string => {
  const trimmed = author.trim()
  return trimmed.charAt(0).toUpperCase() || "A"
}

export const ReviewCard = ({
  review,
  sourceBadge,
  sourceBadgeAlt,
  variant,
  verifiedPurchaseLabel,
}: ReviewCardProps) => {
  const isHomepage = variant === "homepage"
  const shouldShowVerifiedPurchase =
    !isHomepage && review.verifiedPurchase === true

  return (
    <article className="flex h-full flex-col gap-350 rounded-md border border-border-secondary bg-highlight p-350 font-roboto shadow-md">
      <header className="flex items-center gap-350">
        {isHomepage ? (
          <div className="flex h-800 w-800 flex-shrink-0 items-center justify-center">
            <NextImage
              alt={sourceBadgeAlt}
              className="h-full w-full object-contain"
              src={sourceBadge}
            />
          </div>
        ) : (
          <div className="flex h-800 w-800 flex-shrink-0 items-center justify-center rounded-full bg-surface">
            <span className="font-normal text-3xl text-fg-secondary leading-none">
              {resolveReviewInitial(review.author)}
            </span>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-150">
          <div className="flex items-start justify-between gap-250">
            <Rating
              className="pointer-events-none"
              readOnly
              size="md"
              value={review.rating}
            />
            <p className="text-fg-placeholder text-xs leading-tight">
              {review.dateLabel}
            </p>
          </div>

          <p className="truncate font-semibold text-fg-primary text-md leading-tight">
            {review.author}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-250">
        <p className="line-clamp-3 text-fg-secondary text-md leading-relaxed">
          {review.message}
        </p>
      </div>

      {shouldShowVerifiedPurchase ? (
        <div className="mt-auto flex items-center gap-150 text-primary">
          <Icon icon="token-icon-check" size="lg" />
          <span className="font-medium text-sm leading-relaxed">
            {verifiedPurchaseLabel}
          </span>
        </div>
      ) : null}
    </article>
  )
}
