"use client";

import type { FindParams, HttpTypes } from "@medusajs/types";
import type { MedusaCategoryDetailInput } from "@techsio/storefront-data/categories/medusa-service";
import type { StorefrontCategoryListInput } from "./category-query-config";
import {
  buildCategoryListParams,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "./category-query-config";
import { storefront } from "./storefront";

type CategoryHooks = typeof storefront.hooks.categories;

type CategoryListInput = StorefrontCategoryListInput & {
  page?: number;
};

export const categoryService = storefront.services.categories;
export const categoryQueryKeys = storefront.queryKeys.categories;
export const categoryHooks = storefront.hooks.categories;

export const useCategories = (
  input: CategoryListInput,
  options?: Parameters<CategoryHooks["useCategories"]>[1],
) => {
  return categoryHooks.useCategories(
    input as unknown as FindParams & HttpTypes.StoreProductCategoryListParams,
    options,
  );
};

export const useSuspenseCategories = (
  input: CategoryListInput,
  options?: Parameters<CategoryHooks["useSuspenseCategories"]>[1],
) => {
  return categoryHooks.useSuspenseCategories(
    input as unknown as FindParams & HttpTypes.StoreProductCategoryListParams,
    options,
  );
};

export const useCategory = categoryHooks.useCategory;
export const useSuspenseCategory = categoryHooks.useSuspenseCategory;
export const usePrefetchCategory = categoryHooks.usePrefetchCategory;

export const usePrefetchCategories = (
  ...args: Parameters<CategoryHooks["usePrefetchCategories"]>
) => {
  const prefetch = categoryHooks.usePrefetchCategories(...args);

  return {
    ...prefetch,
    prefetchCategories: (
      input: CategoryListInput,
      ...prefetchArgs: Parameters<typeof prefetch.prefetchCategories> extends [
        unknown,
      ]
        ? []
        : never
    ) =>
      prefetch.prefetchCategories(
        input as unknown as FindParams & HttpTypes.StoreProductCategoryListParams,
        ...prefetchArgs,
      ),
    delayedPrefetch: (
      input: CategoryListInput,
      ...prefetchArgs: Parameters<typeof prefetch.delayedPrefetch> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.delayedPrefetch(
        input as unknown as FindParams & HttpTypes.StoreProductCategoryListParams,
        ...prefetchArgs,
      ),
  };
};

export type {
  CategoryListInput,
  MedusaCategoryDetailInput,
  StorefrontCategoryListInput,
};

export { buildCategoryListParams, DEFAULT_CATEGORY_PAGE_SIZE };
