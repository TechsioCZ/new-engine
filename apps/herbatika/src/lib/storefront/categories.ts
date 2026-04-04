"use client";

import type { FindParams, HttpTypes } from "@medusajs/types";
import type { StorefrontCategoryListInput } from "./category-query-config";
import {
  buildCategoryListParams,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "./category-query-config";
import { storefront } from "./storefront";

type CategoryHooks = typeof storefront.hooks.categories;

const categoryHooks = storefront.hooks.categories;
const toCategoryListParams = (
  input: StorefrontCategoryListInput,
): FindParams & HttpTypes.StoreProductCategoryListParams =>
  input as unknown as FindParams & HttpTypes.StoreProductCategoryListParams;

export const useCategories = (
  input: StorefrontCategoryListInput,
  options?: Parameters<CategoryHooks["useCategories"]>[1],
) => {
  return categoryHooks.useCategories(toCategoryListParams(input), options);
};

export const usePrefetchCategory = categoryHooks.usePrefetchCategory;

export const usePrefetchCategories = (
  ...args: Parameters<CategoryHooks["usePrefetchCategories"]>
) => {
  const prefetch = categoryHooks.usePrefetchCategories(...args);

  return {
    ...prefetch,
    prefetchCategories: (
      input: StorefrontCategoryListInput,
      ...prefetchArgs: Parameters<typeof prefetch.prefetchCategories> extends [
        unknown,
      ]
        ? []
        : never
    ) =>
      prefetch.prefetchCategories(toCategoryListParams(input), ...prefetchArgs),
    delayedPrefetch: (
      input: StorefrontCategoryListInput,
      ...prefetchArgs: Parameters<typeof prefetch.delayedPrefetch> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.delayedPrefetch(toCategoryListParams(input), ...prefetchArgs),
  };
};

export type { StorefrontCategoryListInput };

export { buildCategoryListParams, DEFAULT_CATEGORY_PAGE_SIZE };
