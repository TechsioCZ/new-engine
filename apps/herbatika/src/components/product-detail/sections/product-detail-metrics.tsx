"use client";

import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import type { ProductOfferState } from "@/components/product-detail/product-detail.types";

type ProductDetailMetricsProps = {
  offerState: ProductOfferState;
  productCategoriesCount: number;
  variantsCount: number;
};

export function ProductDetailMetrics({
  offerState,
  productCategoriesCount,
  variantsCount,
}: ProductDetailMetricsProps) {
  return (
    <section className="rounded-xl border border-border-secondary bg-surface p-500 lg:p-600">
      <header className="flex flex-wrap items-center justify-between gap-300">
        <h2 className="text-xl font-semibold text-fg-primary">Hodnotenie produktu</h2>
        <div className="flex items-center gap-200">
          <Rating readOnly size="sm" value={0} />
          <ExtraText className="text-fg-tertiary">Zatiaľ bez hodnotení</ExtraText>
        </div>
      </header>

      <div className="mt-400 grid gap-300 md:grid-cols-3">
        <div className="rounded-xl border border-border-secondary bg-surface-secondary p-300">
          <ExtraText className="text-fg-tertiary">Dostupnosť</ExtraText>
          <p className="mt-100 text-sm font-semibold text-fg-primary">
            {offerState.availabilityLabel}
          </p>
        </div>

        <div className="rounded-xl border border-border-secondary bg-surface-secondary p-300">
          <ExtraText className="text-fg-tertiary">Kategórie</ExtraText>
          <p className="mt-100 text-sm font-semibold text-fg-primary">
            {productCategoriesCount > 0
              ? `${productCategoriesCount} zaradení`
              : "Bez zaradenia"}
          </p>
        </div>

        <div className="rounded-xl border border-border-secondary bg-surface-secondary p-300">
          <ExtraText className="text-fg-tertiary">Varianty</ExtraText>
          <p className="mt-100 text-sm font-semibold text-fg-primary">
            {variantsCount > 1 ? `${variantsCount} možností` : "1 možnosť"}
          </p>
        </div>
      </div>
    </section>
  );
}
