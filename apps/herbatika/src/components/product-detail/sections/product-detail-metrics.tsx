"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import NextLink from "next/link";
import type { ProductOfferState } from "@/components/product-detail/product-detail.types";

type ProductDetailMetricsProps = {
  offerState: ProductOfferState;
  productCategoriesCount: number;
  variantsCount: number;
};

type ProductReviewItem = {
  id: string;
  author: string;
  dateLabel: string;
  message: string;
  rating: number;
};

const PRODUCT_DETAIL_REVIEWS: ProductReviewItem[] = [
  {
    id: "review-denisa",
    author: "Denisa Sczyrzická",
    dateLabel: "26.11.2025",
    message:
      "Veľmi som spokojná s Vilcacorou, účinky sú viditeľné už po týždni používania.",
    rating: 5,
  },
  {
    id: "review-anonymous",
    author: "Anonymne",
    dateLabel: "26.11.2025",
    message: "Funguje",
    rating: 5,
  },
  {
    id: "review-maria",
    author: "Maria Marton",
    dateLabel: "26.11.2025",
    message: "Som spokojna s formulou oleja v globulkach.",
    rating: 5,
  },
  {
    id: "review-jozef",
    author: "Jozef Sokolovsky",
    dateLabel: "26.11.2025",
    message: "Produkt je kvalitný a veľmi rýchle dodanie odporúčam.",
    rating: 5,
  },
];

function resolveReviewInitial(author: string): string {
  const trimmed = author.trim();
  return trimmed.charAt(0).toUpperCase() || "A";
}

export function ProductDetailMetrics({
  offerState: _offerState,
  productCategoriesCount: _productCategoriesCount,
  variantsCount: _variantsCount,
}: ProductDetailMetricsProps) {
  return (
    <section className="space-y-500 pt-750">
      <header className="flex flex-wrap items-center justify-between gap-400">
        <div className="flex flex-wrap items-center gap-300">
          <h2 className="text-3xl leading-tight font-semibold text-fg-primary">
            Hodnotenia produktu - <span className="text-primary">5,0</span>
          </h2>
          <Rating className="pointer-events-none" readOnly size="lg" value={5} />
        </div>

        <NextLink
          className="inline-flex items-center gap-50 font-verdana text-sm leading-relaxed text-fg-strong underline decoration-1 underline-offset-2 hover:text-fg-primary"
          href="#reviews"
        >
          Všetky hodnotenia
          <Icon className="text-md" icon="token-icon-chevron-right" />
        </NextLink>
      </header>

      <div className="grid grid-cols-1 gap-500 md:grid-cols-2 xl:grid-cols-4">
        {PRODUCT_DETAIL_REVIEWS.map((review) => (
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
