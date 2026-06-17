"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Rating } from "@techsio/ui-kit/atoms/rating"
import type { StaticImageData } from "next/image"
import NextImage from "next/image"
import NextLink from "next/link"
import type { MouseEvent } from "react"
import { FractionalRating } from "@/components/reviews/fractional-rating"
import { ReviewTrustBadges } from "@/components/reviews/review-trust-badges"
import {
  PRODUCT_REVIEWS,
  REVIEW_VERIFIED_CUSTOMER_BADGE,
} from "@/components/reviews/reviews.data"
import type {
  ReviewItem,
  ReviewTrustSource,
} from "@/components/reviews/reviews.types"

type ReviewsVariant = "product" | "homepage"

type ReviewsSectionProps = {
  sectionClassName?: string
  variant?: ReviewsVariant
  linkHref?: string | null
  linkLabel?: string | null
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  headingText?: string
  scoreLabel?: string | null
  summaryText?: string | null
  ratingValue?: number
  reviews?: readonly ReviewItem[]
  trustSources?: readonly ReviewTrustSource[]
  sourceBadge?: StaticImageData
}

function resolveReviewInitial(author: string): string {
  const trimmed = author.trim()
  return trimmed.charAt(0).toUpperCase() || "A"
}

function ReviewCard({
  review,
  sourceBadge,
  variant,
}: {
  review: ReviewItem
  sourceBadge: StaticImageData
  variant: ReviewsVariant
}) {
  const isHomepage = variant === "homepage"
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
            Overený nákup
          </span>
        </div>
      ) : null}
    </article>
  )
}

export function ReviewsSection({
  sectionClassName = "space-y-500 pt-750",
  variant = "product",
  linkHref,
  linkLabel,
  onLinkClick,
  headingText,
  scoreLabel,
  summaryText,
  ratingValue = 5,
  reviews = PRODUCT_REVIEWS,
  trustSources,
  sourceBadge = REVIEW_VERIFIED_CUSTOMER_BADGE,
}: ReviewsSectionProps) {
  const isHomepage = variant === "homepage"
  const resolvedHeadingText =
    headingText ?? (isHomepage ? "Overené zákazníkmi" : "Hodnotenia produktu")
  const defaultLinkHref = isHomepage ? null : "#reviews"
  const defaultLinkLabel = isHomepage ? null : "Všetky hodnotenia"
  const resolvedLinkHref = linkHref === undefined ? defaultLinkHref : linkHref
  const resolvedLinkLabel =
    linkLabel === undefined ? defaultLinkLabel : linkLabel
  const shouldShowLink = Boolean(resolvedLinkHref && resolvedLinkLabel)
  const formattedRatingLabel = ratingValue.toLocaleString("sk-SK", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })
  const resolvedScoreLabel =
    scoreLabel === undefined ? formattedRatingLabel : scoreLabel
  const ratingAriaLabel = resolvedScoreLabel ?? formattedRatingLabel

  return (
    <section className={sectionClassName}>
      <header className="flex flex-col gap-350 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-300">
          <div>
            <h2 className="font-semibold text-3xl text-fg-primary leading-tight">
              {resolvedHeadingText}
              {resolvedScoreLabel ? (
                <>
                  {" "}
                  - <span className="text-primary">{resolvedScoreLabel}</span>
                </>
              ) : null}
            </h2>
            {summaryText ? (
              <p className="mt-100 text-fg-secondary text-sm leading-relaxed">
                {summaryText}
              </p>
            ) : null}
          </div>
          {isHomepage ? null : (
            <FractionalRating
              label={`Priemerné hodnotenie produktu ${ratingAriaLabel} z 5`}
              value={ratingValue}
            />
          )}
        </div>

        {isHomepage ? (
          <ReviewTrustBadges className="sm:w-auto" sources={trustSources} />
        ) : null}

        {shouldShowLink && resolvedLinkHref && resolvedLinkLabel ? (
          <NextLink
            className="inline-flex items-center gap-50 font-verdana text-fg-strong text-sm leading-relaxed underline decoration-1 underline-offset-2 hover:text-fg-primary"
            href={resolvedLinkHref}
            onClick={onLinkClick}
          >
            {resolvedLinkLabel}
            <Icon icon="token-icon-chevron-right" size="md" />
          </NextLink>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-500 md:grid-cols-2 xl:grid-cols-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            sourceBadge={sourceBadge}
            variant={variant}
          />
        ))}
      </div>
    </section>
  )
}
