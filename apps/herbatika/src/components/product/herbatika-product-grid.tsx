"use client";

import type { HttpTypes } from "@medusajs/types";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";

const GRID_LAYOUT_CLASSNAME = {
  category: "grid grid-cols-2 gap-300 xl:grid-cols-3",
  home: "grid grid-cols-1 gap-400 sm:grid-cols-2 xl:grid-cols-4",
  related: "grid grid-cols-2 gap-400 md:grid-cols-3 xl:grid-cols-4",
  search: "grid gap-300 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
} as const;

export type HerbatikaProductGridLayout = keyof typeof GRID_LAYOUT_CLASSNAME;

type HerbatikaProductGridProps = {
  products: HttpTypes.StoreProduct[];
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void;
  layout: HerbatikaProductGridLayout;
  isProductAdding?: (product: HttpTypes.StoreProduct) => boolean;
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void;
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void;
  getDescriptionOverride?: (product: HttpTypes.StoreProduct) => string | null;
  keyPrefix?: string;
};

export function HerbatikaProductGrid({
  products,
  onAddToCart,
  layout,
  isProductAdding,
  onProductHoverStart,
  onProductHoverEnd,
  getDescriptionOverride,
  keyPrefix,
}: HerbatikaProductGridProps) {
  return (
    <div className={GRID_LAYOUT_CLASSNAME[layout]}>
      {products.map((product, index) => (
        <HerbatikaProductCard
          isAdding={isProductAdding?.(product) ?? false}
          key={`${keyPrefix ?? layout}-${product.id}-${index}`}
          onAddToCart={onAddToCart}
          descriptionOverride={getDescriptionOverride?.(product) ?? null}
          onProductHoverEnd={onProductHoverEnd}
          onProductHoverStart={onProductHoverStart}
          product={product}
        />
      ))}
    </div>
  );
}
