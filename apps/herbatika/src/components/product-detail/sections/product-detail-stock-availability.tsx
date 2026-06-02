"use client";

import type { ProductLocationAvailability } from "@/components/product-detail/product-detail.types";

type ProductDetailStockAvailabilityProps = {
  items: ProductLocationAvailability[];
};

export function ProductDetailStockAvailability({
  items,
}: ProductDetailStockAvailabilityProps) {
  return (
    <section
      aria-labelledby="product-location-availability-heading"
      className="space-y-200 border-border-secondary border-y py-300"
    >
      <h2
        className="font-semibold text-fg-primary text-md leading-tight"
        id="product-location-availability-heading"
      >
        Dostupnost
      </h2>
      <dl className="grid gap-150">
        {items.map((item) => (
          <div
            className="flex min-w-0 items-center justify-between gap-300"
            key={item.id}
          >
            <dt className="flex min-w-0 items-center gap-150 text-fg-secondary text-sm leading-tight">
              <span
                aria-hidden="true"
                className={`h-200 w-200 shrink-0 rounded-full ${
                  item.isInStock ? "bg-primary" : "bg-border-secondary"
                }`}
              />
              <span className="min-w-0 break-words">{item.label}:</span>
            </dt>
            <dd className="shrink-0 text-right font-semibold text-fg-primary text-sm leading-tight">
              {item.displayLabel}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
