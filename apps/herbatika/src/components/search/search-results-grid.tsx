"use client";

import type { HttpTypes } from "@medusajs/types";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";

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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <HerbatikaProductCard
          isAdding={isAddPending && activeProductId === product.id}
          key={product.id}
          onAddToCart={onAddToCart}
          product={product}
        />
      ))}
    </div>
  );
}
