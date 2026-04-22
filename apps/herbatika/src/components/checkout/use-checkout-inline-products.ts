"use client";

import type { HttpTypes } from "@medusajs/types";
import { useQueries } from "@tanstack/react-query";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useMemo } from "react";
import { resolveLineItemProductHandle } from "@/components/header/herbatika-cart-item.utils";
import { resolveRelatedCategoryIds } from "@/lib/storefront/category-tree";
import {
  resolveRecommendedProductFamilyKey,
  selectRecommendedProductRepresentatives,
} from "@/lib/storefront/recommended-product-families";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  useProducts,
} from "@/lib/storefront/products";
import { storefront } from "@/lib/storefront/storefront";

const CHECKOUT_INLINE_PRODUCTS_LIMIT = 10;
const CHECKOUT_INLINE_PRODUCTS_CANDIDATE_LIMIT = 32;

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export function useCheckoutInlineProducts(
  cartItems: HttpTypes.StoreCartLineItem[],
) {
  const region = useRegionContext();

  const cartProductHandles = useMemo(() => {
    const seenHandles = new Set<string>();

    return cartItems.reduce<string[]>((handles, item) => {
      const productHandle = resolveLineItemProductHandle(item);
      if (!productHandle || seenHandles.has(productHandle)) {
        return handles;
      }

      seenHandles.add(productHandle);
      handles.push(productHandle);
      return handles;
    }, []);
  }, [cartItems]);

  const cartProductQueries = useQueries({
    queries: cartProductHandles.map((handle) =>
      ({
        ...storefront.hooks.products.getDetailQueryOptions(
          {
            handle,
            fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
          },
          {
            region,
          },
        ),
        enabled: cartProductHandles.length > 0,
      }),
    ),
  });

  const cartProducts = useMemo(
    () =>
      cartProductQueries.flatMap((query) =>
        query.data ? [query.data as HttpTypes.StoreProduct] : [],
      ),
    [cartProductQueries],
  );

  const relatedCategoryIds = useMemo(() => {
    const seenCategoryIds = new Set<string>();

    return cartProducts.reduce<string[]>((ids, product) => {
      for (const categoryId of resolveRelatedCategoryIds(product)) {
        if (seenCategoryIds.has(categoryId)) {
          continue;
        }

        seenCategoryIds.add(categoryId);
        ids.push(categoryId);
      }

      return ids;
    }, []);
  }, [cartProducts]);

  const relatedProductsQuery = useProducts({
    page: 1,
    limit: CHECKOUT_INLINE_PRODUCTS_CANDIDATE_LIMIT,
    category_id: relatedCategoryIds.length > 0 ? relatedCategoryIds : undefined,
    order: "-created_at",
    fields: STOREFRONT_PRODUCT_CARD_FIELDS,
    enabled: relatedCategoryIds.length > 0,
  });

  const relatedProducts = useMemo(() => {
    const cartProductIds = new Set(
      cartProducts
        .map((product) => asString(product.id))
        .filter((productId): productId is string => Boolean(productId)),
    );
    const cartProductHandlesSet = new Set(
      cartProducts
        .map((product) => asString(product.handle))
        .filter((productHandle): productHandle is string => Boolean(productHandle)),
    );
    const cartFamilyKeys = new Set(
      cartProducts.map((product) => resolveRecommendedProductFamilyKey(product)),
    );

    const filteredProducts = relatedProductsQuery.products.filter((product) => {
      const productId = asString(product.id);
      if (productId && cartProductIds.has(productId)) {
        return false;
      }

      const productHandle = asString(product.handle);
      if (productHandle && cartProductHandlesSet.has(productHandle)) {
        return false;
      }

      const productFamilyKey = resolveRecommendedProductFamilyKey(product);
      return !cartFamilyKeys.has(productFamilyKey);
    });

    return selectRecommendedProductRepresentatives(
      filteredProducts,
      CHECKOUT_INLINE_PRODUCTS_LIMIT,
    );
  }, [cartProducts, relatedProductsQuery.products]);

  const isLoading =
    cartProductQueries.some((query) => query.isPending) ||
    relatedProductsQuery.isLoading;

  return {
    isLoading,
    products: relatedProducts,
  };
}
