"use client";

import type { HttpTypes } from "@medusajs/types";
import { useMemo } from "react";
import type { StorefrontSearchHit } from "@/lib/storefront/meili-search";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  useProducts,
} from "@/lib/storefront/products";
import { SEARCH_RESULT_LIMIT } from "./search-query-config";

type UseSearchProductsInput = {
  query: string;
  hits: StorefrontSearchHit[];
  regionId?: string;
  countryCode?: string;
};

export const useSearchProducts = ({
  query,
  hits,
  regionId,
  countryCode,
}: UseSearchProductsInput) => {
  const searchHitHandles = useMemo(() => {
    const handles = new Set<string>();

    for (const hit of hits) {
      const normalizedHandle = hit.handle.trim();
      if (!normalizedHandle) {
        continue;
      }

      handles.add(normalizedHandle);
    }

    return Array.from(handles);
  }, [hits]);

  const searchProductsQuery = useProducts({
    page: 1,
    limit: searchHitHandles.length || SEARCH_RESULT_LIMIT,
    fields: STOREFRONT_PRODUCT_CARD_FIELDS,
    handle: searchHitHandles.length > 0 ? searchHitHandles : undefined,
    region_id: regionId,
    country_code: countryCode,
    enabled:
      query.length > 0 && searchHitHandles.length > 0 && Boolean(regionId),
  });

  const productsByHandle = useMemo(() => {
    const handleToProduct = new Map<string, HttpTypes.StoreProduct>();

    for (const product of searchProductsQuery.products) {
      const handle = product.handle?.trim();
      if (!handle || handleToProduct.has(handle)) {
        continue;
      }

      handleToProduct.set(handle, product);
    }

    return handleToProduct;
  }, [searchProductsQuery.products]);

  const orderedProducts = useMemo(() => {
    return hits
      .map((hit) => productsByHandle.get(hit.handle.trim()))
      .filter((product): product is HttpTypes.StoreProduct => Boolean(product));
  }, [hits, productsByHandle]);

  const missingProductsCount = Math.max(
    hits.length - orderedProducts.length,
    0,
  );

  const isProductGridLoading =
    query.length > 0 &&
    hits.length > 0 &&
    Boolean(regionId) &&
    (searchProductsQuery.isLoading ||
      (searchProductsQuery.isFetching && orderedProducts.length === 0));

  return {
    orderedProducts,
    missingProductsCount,
    isProductGridLoading,
  };
};
