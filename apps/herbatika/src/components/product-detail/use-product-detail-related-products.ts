"use client";

import { useMemo } from "react";
import { RELATED_PRODUCTS_LIMIT } from "@/components/product-detail/product-detail.constants";
import type { StorefrontProduct } from "@/components/product-detail/product-detail.types";
import {
  orderProductsByReferenceCodes,
  resolveProductReferenceHandle,
  resolveRelatedProductReferenceCodes,
  resolveRelatedSections,
} from "@/components/product-detail/utils/related-products";
import { resolveRelatedCategoryIds } from "@/lib/storefront/category-tree";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_RELATED_PRODUCT_FIELDS,
  useProducts,
} from "@/lib/storefront/products";
import {
  orderProductsByHandles,
  useRecentlyVisitedProductHandles,
} from "@/lib/storefront/recently-visited-products";

type UseProductDetailRelatedProductsProps = {
  product: StorefrontProduct | null;
};

export function useProductDetailRelatedProducts({
  product,
}: UseProductDetailRelatedProductsProps) {
  const relatedCategoryIds = useMemo(
    () => resolveRelatedCategoryIds(product),
    [product],
  );
  const relatedReferenceCodes = useMemo(
    () => resolveRelatedProductReferenceCodes(product),
    [product],
  );
  const relatedReferenceHandles = useMemo(() => {
    return relatedReferenceCodes
      .map(resolveProductReferenceHandle)
      .filter((handle): handle is string => Boolean(handle));
  }, [relatedReferenceCodes]);
  const recentlyVisitedHandles = useRecentlyVisitedProductHandles({
    excludeHandle: product?.handle,
  });

  const referencedProductsQuery = useProducts({
    page: 1,
    limit: RELATED_PRODUCTS_LIMIT,
    handle:
      relatedReferenceHandles.length > 0 ? relatedReferenceHandles : undefined,
    fields: STOREFRONT_RELATED_PRODUCT_FIELDS,
    enabled: Boolean(product?.id && relatedReferenceHandles.length > 0),
  });

  const fallbackProductsQuery = useProducts({
    page: 1,
    limit: RELATED_PRODUCTS_LIMIT,
    category_id: relatedCategoryIds.length > 0 ? relatedCategoryIds : undefined,
    order: "-created_at",
    fields: STOREFRONT_PRODUCT_CARD_FIELDS,
    enabled: Boolean(product?.id),
  });
  const recentlyVisitedProductsQuery = useProducts({
    page: 1,
    limit: RELATED_PRODUCTS_LIMIT,
    handle:
      recentlyVisitedHandles.length > 0 ? recentlyVisitedHandles : undefined,
    fields: STOREFRONT_PRODUCT_CARD_FIELDS,
    enabled: Boolean(product?.id && recentlyVisitedHandles.length > 0),
  });

  const relatedProducts = useMemo(() => {
    const referencedProducts = orderProductsByReferenceCodes(
      referencedProductsQuery.products,
      relatedReferenceCodes,
    );
    const products = [...referencedProducts, ...fallbackProductsQuery.products];
    const usedProductIds = new Set<string>();
    const filtered: StorefrontProduct[] = [];

    for (const relatedProduct of products) {
      if (!relatedProduct.id || relatedProduct.id === product?.id) {
        continue;
      }

      if (usedProductIds.has(relatedProduct.id)) {
        continue;
      }

      usedProductIds.add(relatedProduct.id);
      filtered.push(relatedProduct);
    }

    return filtered.slice(0, RELATED_PRODUCTS_LIMIT);
  }, [
    fallbackProductsQuery.products,
    product?.id,
    referencedProductsQuery.products,
    relatedReferenceCodes,
  ]);

  const recentlyVisitedProducts = useMemo(() => {
    return orderProductsByHandles(
      recentlyVisitedProductsQuery.products,
      recentlyVisitedHandles,
    ).filter((recentProduct) => recentProduct.id !== product?.id);
  }, [
    product?.id,
    recentlyVisitedHandles,
    recentlyVisitedProductsQuery.products,
  ]);

  return useMemo(
    () => resolveRelatedSections(relatedProducts, recentlyVisitedProducts),
    [relatedProducts, recentlyVisitedProducts],
  );
}
