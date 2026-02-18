"use client";

import type { HttpTypes } from "@medusajs/types";
import { HerbatikaProductGrid } from "@/components/product/herbatika-product-grid";

type SearchResultsGridProps = {
  products: HttpTypes.StoreProduct[];
  activeProductId: string | null;
  isAddPending: boolean;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void;
};

export function SearchResultsGrid({
  products,
  activeProductId,
  isAddPending,
  onAddToCart,
}: SearchResultsGridProps) {
  return (
    <HerbatikaProductGrid
      isProductAdding={(product) => isAddPending && activeProductId === product.id}
      keyPrefix="search-product"
      layout="search"
      onAddToCart={onAddToCart}
      products={products}
    />
  );
}
