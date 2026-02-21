"use client";

import type { HttpTypes } from "@medusajs/types";
import { useMemo } from "react";
import type { StorefrontSearchHit } from "@/lib/storefront/meili-search";
import { useStorefrontSearchProducts } from "@/lib/storefront/search";
import { resolveSortedUniqueSearchHitHandles } from "./search-hit-utils";

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
  const sortedSearchHitHandles = useMemo(() => {
    return resolveSortedUniqueSearchHitHandles(hits);
  }, [hits]);

  const descriptionByHandle = useMemo(() => {
    const nextDescriptions: Record<string, string> = {};

    for (const hit of hits) {
      const normalizedHandle = hit.handle.trim();
      if (!normalizedHandle || nextDescriptions[normalizedHandle]) {
        continue;
      }

      const snippet = hit.descriptionSnippet.trim();
      if (!snippet) {
        continue;
      }

      nextDescriptions[normalizedHandle] = snippet;
    }

    return nextDescriptions;
  }, [hits]);

  const searchProductsQuery = useStorefrontSearchProducts({
    handles: sortedSearchHitHandles,
    regionId,
    countryCode,
    enabled:
      query.length > 0 && sortedSearchHitHandles.length > 0 && Boolean(regionId),
  });

  const productsByHandle = useMemo(() => {
    const handleToProduct = new Map<string, HttpTypes.StoreProduct>();

    for (const product of searchProductsQuery.data?.products ?? []) {
      const handle = product.handle?.trim();
      if (!handle || handleToProduct.has(handle)) {
        continue;
      }

      handleToProduct.set(handle, product);
    }

    return handleToProduct;
  }, [searchProductsQuery.data?.products]);

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
    descriptionByHandle,
    missingProductsCount,
    isProductGridLoading,
  };
};
