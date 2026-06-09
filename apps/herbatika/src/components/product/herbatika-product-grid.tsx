"use client";

import type { HttpTypes } from "@medusajs/types";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";

const CATALOG_PRODUCT_GRID_CLASSNAME =
  "grid grid-cols-1 gap-300 sm:grid-cols-2 xl:grid-cols-3";
const COLLECTION_PRODUCT_GRID_CLASSNAME =
  "grid grid-cols-1 gap-400 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

export const HERBATIKA_PRODUCT_GRID_LAYOUT_CLASSNAME = {
  catalog: CATALOG_PRODUCT_GRID_CLASSNAME,
  collection: COLLECTION_PRODUCT_GRID_CLASSNAME,
} as const;

export type HerbatikaProductGridLayout =
  keyof typeof HERBATIKA_PRODUCT_GRID_LAYOUT_CLASSNAME;

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
    <div className={`${HERBATIKA_PRODUCT_GRID_LAYOUT_CLASSNAME[layout]} min-w-0`}>
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
