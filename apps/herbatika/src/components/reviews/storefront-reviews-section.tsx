"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import NextLink from "next/link";
import { STOREFRONT_REVIEWS } from "@/components/reviews/storefront-reviews.data";
import type { StorefrontReviewItem } from "@/components/reviews/storefront-reviews.types";

type StorefrontReviewsSectionProps = {
  sectionClassName?: string;
  linkHref?: string;
  linkLabel?: string;
  headingText?: string;
  scoreLabel?: string;
  ratingValue?: number;
  reviews?: readonly StorefrontReviewItem[];
};

function resolveReviewInitial(author: string): string {
  const trimmed = author.trim();
  return trimmed.charAt(0).toUpperCase() || "A";
}

export function StorefrontReviewsSection({
  sectionClassName = "space-y-500 pt-750",
  linkHref = "#reviews",
  linkLabel = "Všetky hodnotenia",
  headingText = "Hodnotenia produktu",
  scoreLabel = "5,0",
  ratingValue = 5,
  reviews = STOREFRONT_REVIEWS,
}: StorefrontReviewsSectionProps) {
  return (
    <section className={sectionClassName}>
      <header className="flex flex-wrap items-center justify-between gap-400">
        <div className="flex flex-wrap items-center gap-300">
          <h2 className="text-3xl leading-tight font-semibold text-fg-primary">
            {headingText} - <span className="text-primary">{scoreLabel}</span>
          </h2>
          <Rating className="pointer-events-none" readOnly size="lg" value={ratingValue} />
        </div>

        <NextLink
          className="inline-flex items-center gap-50 font-verdana text-sm leading-relaxed text-fg-strong underline decoration-1 underline-offset-2 hover:text-fg-primary"
          href={linkHref}
        >
          {linkLabel}
          <Icon className="text-md" icon="token-icon-chevron-right" />
        </NextLink>
      </header>

      <div className="grid grid-cols-1 gap-500 md:grid-cols-2 xl:grid-cols-4">
        {reviews.map((review) => (
          <article
            className="flex h-full flex-col gap-350 rounded-md border border-border-secondary bg-highlight p-350 shadow-md"
            key={review.id}
          >
            <header className="flex items-center gap-350">
              <div className="flex h-800 w-800 flex-shrink-0 items-center justify-center rounded-full bg-surface">
                <span className="text-3xl leading-none font-normal text-fg-secondary">
                  {resolveReviewInitial(review.author)}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-150">
                <div className="flex items-start justify-between gap-250">
                  <Rating className="pointer-events-none" readOnly size="md" value={review.rating} />
                  <p className="text-xs leading-tight text-fg-placeholder">{review.dateLabel}</p>
                </div>

                <p className="truncate text-sm leading-tight font-semibold text-fg-primary">
                  {review.author}
                </p>
              </div>
            </header>

            <p className="line-clamp-2 min-h-700 text-sm leading-relaxed text-fg-secondary">
              {review.message}
            </p>

            <div className="mt-auto flex items-center gap-150 text-primary">
              <Icon className="text-lg" icon="token-icon-check" />
              <span className="text-sm leading-relaxed font-medium">Overený nákup</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
