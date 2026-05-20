"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import type { StaticImageData } from "next/image";
import NextImage from "next/image";
import NextLink from "next/link";
import { StorefrontReviewTrustBadges } from "@/components/reviews/storefront-review-trust-badges";
import {
  STOREFRONT_PRODUCT_REVIEWS,
  STOREFRONT_REVIEW_VERIFIED_CUSTOMER_BADGE,
} from "@/components/reviews/storefront-reviews.data";
import type {
  StorefrontReviewItem,
  StorefrontReviewTrustSource,
} from "@/components/reviews/storefront-reviews.types";
import type { StorefrontRoute } from "@/lib/route-paths";

type StorefrontReviewsVariant = "product" | "homepage";

type StorefrontReviewsSectionProps = {
  sectionClassName?: string;
  variant?: StorefrontReviewsVariant;
  linkHref?: StorefrontRoute | null;
  linkLabel?: string | null;
  headingText?: string;
  scoreLabel?: string | null;
  ratingValue?: number;
  reviews?: readonly StorefrontReviewItem[];
  trustSources?: readonly StorefrontReviewTrustSource[];
  sourceBadge?: StaticImageData;
};

function resolveReviewInitial(author: string): string {
  const trimmed = author.trim();
  return trimmed.charAt(0).toUpperCase() || "A";
}

function ReviewCard({
  review,
  sourceBadge,
  variant,
}: {
  review: StorefrontReviewItem;
  sourceBadge: StaticImageData;
  variant: StorefrontReviewsVariant;
}) {
  const isHomepage = variant === "homepage";

  return (
    <article className="flex h-full font-roboto flex-col gap-350 rounded-md border border-border-secondary bg-highlight p-350 shadow-md">
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
            <span className="text-3xl leading-none font-normal text-fg-secondary">
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
            <p className="text-xs leading-tight text-fg-placeholder">{review.dateLabel}</p>
          </div>

          <p className="truncate text-md leading-tight font-semibold text-fg-primary">
            {review.author}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-250">
        {review.title ? (
          <p className="flex items-center gap-150 text-md leading-relaxed text-fg-secondary">
            <Icon className="text-primary" icon="token-icon-plus" size="md" />
            <span className="truncate">{review.title}</span>
          </p>
        ) : null}

        <p className="line-clamp-3 text-md leading-relaxed text-fg-secondary">
          {review.message}
        </p>
      </div>

      {review.verifiedPurchase ? (
        <div className="mt-auto flex items-center gap-150 text-primary">
          <Icon icon="token-icon-check" size="lg" />
          <span className="text-sm leading-relaxed font-medium">Overený nákup</span>
        </div>
      ) : null}
    </article>
  );
}

export function StorefrontReviewsSection({
  sectionClassName = "space-y-500 pt-750",
  variant = "product",
  linkHref,
  linkLabel,
  headingText,
  scoreLabel = "5,0",
  ratingValue = 5,
  reviews = STOREFRONT_PRODUCT_REVIEWS,
  trustSources,
  sourceBadge = STOREFRONT_REVIEW_VERIFIED_CUSTOMER_BADGE,
}: StorefrontReviewsSectionProps) {
  const isHomepage = variant === "homepage";
  const resolvedHeadingText =
    headingText ?? (isHomepage ? "Overené zákazníkmi" : "Hodnotenia produktu");
  const resolvedLinkHref = linkHref ?? (isHomepage ? null : "#reviews");
  const resolvedLinkLabel = linkLabel ?? (isHomepage ? null : "Všetky hodnotenia");
  const shouldShowLink = Boolean(resolvedLinkHref && resolvedLinkLabel);

  return (
    <section className={sectionClassName}>
      <header className="flex flex-col gap-350 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-300">
          <h2 className="text-3xl leading-tight font-semibold text-fg-primary">
            {resolvedHeadingText}
            {scoreLabel ? (
              <>
                {" "}
                - <span className="text-primary">{scoreLabel}</span>
              </>
            ) : null}
          </h2>
          {isHomepage ? null : (
            <Rating
              className="pointer-events-none"
              readOnly
              size="lg"
              value={ratingValue}
            />
          )}
        </div>

        {isHomepage ? (
          <StorefrontReviewTrustBadges className="sm:w-auto" sources={trustSources} />
        ) : null}

        {shouldShowLink && resolvedLinkHref && resolvedLinkLabel ? (
          <NextLink
            className="inline-flex items-center gap-50 font-verdana text-sm leading-relaxed text-fg-strong underline decoration-1 underline-offset-2 hover:text-fg-primary"
            href={resolvedLinkHref}
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
  );
}
