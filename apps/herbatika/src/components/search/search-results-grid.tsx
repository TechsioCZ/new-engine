"use client";

import type { HttpTypes } from "@medusajs/types";
import { HerbatikaProductGrid } from "@/components/product/herbatika-product-grid";

type SearchResultsGridProps = {
  products: HttpTypes.StoreProduct[];
  descriptionByHandle: Record<string, string>;
  activeProductId: string | null;
  isAddPending: boolean;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void;
};

export function SearchResultsGrid({
  products,
  descriptionByHandle,
  activeProductId,
  isAddPending,
  onAddToCart,
}: SearchResultsGridProps) {
  return (
    <HerbatikaProductGrid
      getDescriptionOverride={(product) => {
        const handle = product.handle?.trim();
        if (!handle) {
          return null;
        }
        return descriptionByHandle[handle] ?? null;
      }}
      isProductAdding={(product) => isAddPending && activeProductId === product.id}
      keyPrefix="search-product"
      layout="search"
      onAddToCart={onAddToCart}
      products={products}
    />
  );
}
