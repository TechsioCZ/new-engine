"use client";

import { useMemo } from "react";
import { RELATED_PRODUCTS_LIMIT } from "@/components/product-detail/product-detail.constants";
import type { StorefrontProduct } from "@/components/product-detail/product-detail.types";
import { resolveRelatedSections } from "@/components/product-detail/utils/related-products";
import { resolveRelatedCategoryIds } from "@/lib/storefront/category-tree";
import { STOREFRONT_PRODUCT_CARD_FIELDS, useProducts } from "@/lib/storefront/products";

type UseProductDetailRelatedProductsProps = {
  product: StorefrontProduct | null;
  regionId: string | null | undefined;
};

export function useProductDetailRelatedProducts({
  product,
  regionId,
}: UseProductDetailRelatedProductsProps) {
  const relatedCategoryIds = useMemo(() => resolveRelatedCategoryIds(product), [product]);

  const relatedProductsQuery = useProducts({
    page: 1,
    limit: RELATED_PRODUCTS_LIMIT,
    category_id: relatedCategoryIds.length > 0 ? relatedCategoryIds : undefined,
    order: "-created_at",
    fields: STOREFRONT_PRODUCT_CARD_FIELDS,
    enabled: Boolean(regionId && product?.id),
  });

  const relatedProducts = useMemo(() => {
    const filtered = relatedProductsQuery.products.filter(
      (relatedProduct) => relatedProduct.id !== product?.id,
    );

    return filtered.slice(0, RELATED_PRODUCTS_LIMIT);
  }, [product?.id, relatedProductsQuery.products]);

  return useMemo(() => resolveRelatedSections(relatedProducts), [relatedProducts]);
}
