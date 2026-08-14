"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Rating } from "@techsio/ui-kit/atoms/rating"
import type { StaticImageData } from "next/image"
import NextImage from "next/image"
import { useTranslations } from "next-intl"
import {
  resolveReviewInitial,
  resolveVisibleReviewMessage,
  resolveVisibleReviewPoints,
} from "@/components/reviews/review-card.utils"
import type {
  ReviewItem,
  ReviewsVariant,
} from "@/components/reviews/reviews.types"

function ReviewRecommendation({
  label,
  recommended,
}: {
  label: string
  recommended?: boolean | null
}) {
  if (recommended === null || recommended === undefined) {
    return null
  }

  return (
    <p className="flex items-center gap-150 font-medium text-fg-primary text-sm leading-relaxed">
      <Icon
        color={recommended ? "primary" : "danger"}
        icon={recommended ? "token-icon-check" : "token-icon-minus"}
        size="sm"
      />
      {label}
    </p>
  )
}

function ReviewPointList({
  label,
  points,
  tone,
}: {
  label: string
  points: readonly string[]
  tone: "positive" | "negative"
}) {
  if (points.length === 0) {
    return null
  }

  const isPositive = tone === "positive"

  return (
    <ul aria-label={label} className="space-y-150">
      {points.map((point, index) => (
        <li
          className="flex min-w-0 items-start gap-150 text-fg-secondary text-sm leading-relaxed"
          key={`${tone}-${index}-${point}`}
        >
          <span
            className={`mt-50 flex h-400 w-400 shrink-0 items-center justify-center rounded-full ${
              isPositive ? "bg-primary-light" : "bg-danger-light"
            }`}
          >
            <Icon
              color={isPositive ? "primary" : "danger"}
              icon={isPositive ? "token-icon-plus" : "token-icon-minus"}
              size="xs"
            />
          </span>
          <span className="line-clamp-2 min-w-0">{point}</span>
        </li>
      ))}
    </ul>
  )
}

export function ReviewCard({
  review,
  sourceBadge,
  variant,
}: {
  review: ReviewItem
  sourceBadge: StaticImageData
  variant: ReviewsVariant
}) {
  const tCatalog = useTranslations("catalog")
  const isHomepage = variant === "homepage"
  const positivePoints = resolveVisibleReviewPoints(review.positivePoints)
  const negativePoints = resolveVisibleReviewPoints(review.negativePoints)
  const reviewMessage = resolveVisibleReviewMessage(review.message, [
    positivePoints,
    negativePoints,
  ])
  const hasPointList = positivePoints.length > 0 || negativePoints.length > 0
  const shouldShowVerifiedPurchase = !isHomepage && review.verifiedPurchase
  let recommendationLabel = review.recommended
    ? tCatalog("reviews.recommends_product")
    : tCatalog("reviews.does_not_recommend_product")

  if (isHomepage) {
    recommendationLabel = review.recommended
      ? tCatalog("reviews.recommends_shop")
      : tCatalog("reviews.does_not_recommend_shop")
  }

  return (
    <article className="flex h-full flex-col gap-350 rounded-md border border-border-secondary bg-highlight p-350 font-roboto shadow-md">
      <header className="flex items-center gap-350">
        {isHomepage ? (
          <div className="flex h-800 w-800 flex-shrink-0 items-center justify-center">
            <NextImage
              alt={tCatalog("reviews.verified_customer_badge_alt")}
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
        <ReviewRecommendation
          label={recommendationLabel}
          recommended={review.recommended}
        />

        {reviewMessage ? (
          <p
            className={`text-fg-secondary text-md leading-relaxed ${
              hasPointList ? "line-clamp-2" : "line-clamp-3"
            }`}
          >
            {reviewMessage}
          </p>
        ) : null}

        <ReviewPointList
          label={tCatalog("reviews.positive_points")}
          points={positivePoints}
          tone="positive"
        />
        <ReviewPointList
          label={tCatalog("reviews.negative_points")}
          points={negativePoints}
          tone="negative"
        />
      </div>

      {shouldShowVerifiedPurchase ? (
        <div className="mt-auto flex items-center gap-150 text-primary">
          <Icon icon="token-icon-check" size="lg" />
          <span className="font-medium text-sm leading-relaxed">
            {tCatalog("reviews.verified_purchase")}
          </span>
        </div>
      ) : null}
    </article>
  )
}
