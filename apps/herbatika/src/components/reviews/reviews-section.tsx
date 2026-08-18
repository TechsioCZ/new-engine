"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import type { StaticImageData } from "next/image"
import NextLink from "next/link"
import { useFormatter, useTranslations } from "next-intl"
import type { MouseEvent } from "react"
import { FractionalRating } from "@/components/reviews/fractional-rating"
import { ReviewCard } from "@/components/reviews/review-card"
import { ReviewTrustBadges } from "@/components/reviews/review-trust-badges"
import { REVIEW_VERIFIED_CUSTOMER_BADGE } from "@/components/reviews/reviews.data"
import type {
  ReviewItem,
  ReviewsVariant,
  ReviewTrustSource,
} from "@/components/reviews/reviews.types"

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
  reviews: readonly ReviewItem[]
  trustSources?: readonly ReviewTrustSource[]
  sourceBadge?: StaticImageData
}

const getAverageRating = (reviews: readonly ReviewItem[]): number => {
  if (reviews.length === 0) {
    return 0
  }

  return (
    reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
  )
}

const getReviewLink = (
  href: string | null,
  label: string | null
): { href: string; label: string } | null =>
  href && label ? { href, label } : null

export function ReviewsSection({
  sectionClassName = "space-y-500 pt-750",
  variant = "product",
  linkHref,
  linkLabel,
  onLinkClick,
  headingText,
  scoreLabel,
  summaryText,
  ratingValue,
  reviews,
  trustSources,
  sourceBadge = REVIEW_VERIFIED_CUSTOMER_BADGE,
}: ReviewsSectionProps) {
  const format = useFormatter()
  const tCatalog = useTranslations("catalog")
  const isHomepage = variant === "homepage"
  const resolvedRatingValue = ratingValue ?? getAverageRating(reviews)
  const resolvedHeadingText =
    headingText ??
    (isHomepage
      ? tCatalog("reviews.homepage_title")
      : tCatalog("reviews.product_title"))
  const defaultLinkHref = isHomepage ? null : "#reviews"
  const defaultLinkLabel = isHomepage ? null : tCatalog("reviews.all_reviews")
  const resolvedLinkHref = linkHref === undefined ? defaultLinkHref : linkHref
  const resolvedLinkLabel =
    linkLabel === undefined ? defaultLinkLabel : linkLabel
  const reviewLink = getReviewLink(resolvedLinkHref, resolvedLinkLabel)
  const formattedRatingLabel = format.number(resolvedRatingValue, {
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
              label={tCatalog("reviews.rating_aria", {
                max: 5,
                rating: ratingAriaLabel,
              })}
              value={resolvedRatingValue}
            />
          )}
        </div>

        {isHomepage ? (
          <ReviewTrustBadges
            className="sm:w-auto"
            sources={trustSources ?? []}
          />
        ) : null}

        {reviewLink ? (
          <NextLink
            className="inline-flex items-center gap-50 font-verdana text-fg-strong text-sm leading-relaxed underline decoration-1 underline-offset-2 hover:text-fg-primary"
            href={reviewLink.href}
            onClick={onLinkClick}
          >
            {reviewLink.label}
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
