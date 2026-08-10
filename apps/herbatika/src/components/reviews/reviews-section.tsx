"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { useFormatter, useTranslations } from "next-intl"
import type { StaticImageData } from "next/image"
import type { MouseEvent } from "react"

import verifiedCustomerBadge from "@/assets/third-parties/overeny-zakaznik.avif"
import NextLink from "@/components/app-link"
import { FractionalRating } from "@/components/reviews/fractional-rating"
import { ReviewCard } from "@/components/reviews/review-card"
import type { ReviewsVariant } from "@/components/reviews/review-card"
import { ReviewTrustBadges } from "@/components/reviews/review-trust-badges"
import {
  resolveLinkClickProps,
  resolveReviewsHeading,
  resolveReviewsLinkHref,
  resolveReviewsLinkLabel,
  resolveTrustSourceProps,
} from "@/components/reviews/reviews-section-options"
import { PRODUCT_REVIEWS } from "@/components/reviews/reviews.data"
import type {
  ReviewItem,
  ReviewTrustSource,
} from "@/components/reviews/reviews.types"

interface ReviewsSectionProps {
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

export const ReviewsSection = ({
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
  sourceBadge = verifiedCustomerBadge,
}: ReviewsSectionProps) => {
  const format = useFormatter()
  const tCatalog = useTranslations("catalog")
  const isHomepage = variant === "homepage"
  const resolvedHeadingText = resolveReviewsHeading(
    headingText,
    isHomepage,
    tCatalog("reviews.homepage_title"),
    tCatalog("reviews.product_title"),
  )
  const resolvedLinkHref = resolveReviewsLinkHref(linkHref, isHomepage)
  const resolvedLinkLabel = resolveReviewsLinkLabel(
    linkLabel,
    isHomepage,
    tCatalog("reviews.all_reviews"),
  )
  const shouldShowLink =
    resolvedLinkHref !== null &&
    resolvedLinkHref.length > 0 &&
    resolvedLinkLabel !== null &&
    resolvedLinkLabel.length > 0
  const formattedRatingLabel = format.number(ratingValue, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })
  const resolvedScoreLabel =
    scoreLabel === undefined ? formattedRatingLabel : scoreLabel
  const ratingAriaLabel = resolvedScoreLabel ?? formattedRatingLabel
  const trustSourceProps = resolveTrustSourceProps(trustSources)
  const linkClickProps = resolveLinkClickProps(onLinkClick)

  return (
    <section className={sectionClassName}>
      <header className="flex flex-col gap-350 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-300">
          <div>
            <h2 className="font-semibold text-3xl text-fg-primary leading-tight">
              {resolvedHeadingText}
              {resolvedScoreLabel !== null && resolvedScoreLabel.length > 0 ? (
                <>
                  {" "}
                  - <span className="text-primary">{resolvedScoreLabel}</span>
                </>
              ) : null}
            </h2>
            {summaryText !== null &&
            summaryText !== undefined &&
            summaryText.length > 0 ? (
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
              value={ratingValue}
            />
          )}
        </div>

        {isHomepage ? (
          <ReviewTrustBadges className="sm:w-auto" {...trustSourceProps} />
        ) : null}

        {shouldShowLink ? (
          <NextLink
            className="inline-flex items-center gap-50 font-verdana text-fg-strong text-sm leading-relaxed underline decoration-1 underline-offset-2 hover:text-fg-primary"
            href={resolvedLinkHref}
            {...linkClickProps}
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
            sourceBadgeAlt={tCatalog("reviews.verified_customer_badge_alt")}
            variant={variant}
            verifiedPurchaseLabel={tCatalog("reviews.verified_purchase")}
          />
        ))}
      </div>
    </section>
  )
}
