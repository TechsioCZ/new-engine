import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Rating } from "@techsio/ui-kit/atoms/rating"
import type { StaticImageData } from "next/image"
import NextImage from "next/image"
import type { ReviewItem } from "@/components/reviews/reviews.types"

export type ReviewsVariant = "product" | "homepage"

const REVIEW_POINT_LIMIT = 2

function resolveReviewInitial(author: string): string {
  const trimmed = author.trim()
  return trimmed.charAt(0).toUpperCase() || "A"
}

const normalizeReviewText = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase()

const resolveVisiblePoints = (points: readonly string[] | undefined) =>
  points?.map((point) => point.trim()).filter(Boolean).slice(0, REVIEW_POINT_LIMIT) ??
  []

const resolveVisibleMessage = (
  message: string | undefined,
  pointGroups: readonly (readonly string[])[]
) => {
  if (!message?.trim()) {
    return
  }

  const normalizedMessage = normalizeReviewText(message)
  const normalizedPointGroups = pointGroups
    .filter((points) => points.length > 0)
    .map((points) => normalizeReviewText(points.join(" ")))

  if (normalizedPointGroups.some((pointGroup) => pointGroup === normalizedMessage)) {
    return
  }

  return message
}

const resolveRecommendationLabel = (
  recommended: boolean,
  variant: ReviewsVariant
) => {
  const target = variant === "homepage" ? "obchod" : "produkt"

  return recommended ? `Odporúča ${target}` : `Neodporúča ${target}`
}

function ReviewRecommendation({
  recommended,
  variant,
}: {
  recommended?: boolean | null
  variant: ReviewsVariant
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
      {resolveRecommendationLabel(recommended, variant)}
    </p>
  )
}

function ReviewPointList({
  points,
  tone,
}: {
  points: readonly string[]
  tone: "positive" | "negative"
}) {
  if (points.length === 0) {
    return null
  }

  const isPositive = tone === "positive"

  return (
    <ul
      aria-label={isPositive ? "Pozitíva recenzie" : "Negatíva recenzie"}
      className="space-y-150"
    >
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
  const isHomepage = variant === "homepage"
  const positivePoints = resolveVisiblePoints(review.positivePoints)
  const negativePoints = resolveVisiblePoints(review.negativePoints)
  const reviewMessage = resolveVisibleMessage(review.message, [positivePoints, negativePoints])
  const hasPointList = positivePoints.length > 0 || negativePoints.length > 0
  const shouldShowVerifiedPurchase = !isHomepage && review.verifiedPurchase

  return (
    <article className="flex h-full flex-col gap-350 rounded-md border border-border-secondary bg-highlight p-350 font-roboto shadow-md">
      <header className="flex items-center gap-350">
        {isHomepage ? (
          <div className="flex h-800 w-800 flex-shrink-0 items-center justify-center">
            <NextImage
              alt="Overené zákazníkmi Heureka"
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
            <Rating className="pointer-events-none" readOnly size="md" value={review.rating} />
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
        <ReviewRecommendation recommended={review.recommended} variant={variant} />

        {reviewMessage ? (
          <p
            className={`text-fg-secondary text-md leading-relaxed ${
              hasPointList ? "line-clamp-2" : "line-clamp-3"
            }`}
          >
            {reviewMessage}
          </p>
        ) : null}

        <ReviewPointList points={positivePoints} tone="positive" />
        <ReviewPointList points={negativePoints} tone="negative" />
      </div>

      {shouldShowVerifiedPurchase ? (
        <div className="mt-auto flex items-center gap-150 text-primary">
          <Icon icon="token-icon-check" size="lg" />
          <span className="font-medium text-sm leading-relaxed">
            Overený nákup
          </span>
        </div>
      ) : null}
    </article>
  )
}
