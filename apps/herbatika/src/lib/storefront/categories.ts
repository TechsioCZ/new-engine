"use client"

import type { FindParams, HttpTypes } from "@medusajs/types"
import type { CategoryListInput } from "./category-query-config"
import {
  buildCategoryListParams,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "./category-query-config"
import { storefront } from "./storefront"

type CategoryHooks = typeof storefront.hooks.categories

const categoryHooks = storefront.hooks.categories
const toCategoryListParams = (
  input: CategoryListInput
): FindParams & HttpTypes.StoreProductCategoryListParams =>
  input as unknown as FindParams & HttpTypes.StoreProductCategoryListParams

export const useCategories = (
  input: CategoryListInput,
  options?: Parameters<CategoryHooks["useCategories"]>[1]
) =>
  categoryHooks.useCategories(
    toCategoryListParams(buildCategoryListParams(input)),
    options
  )

export const usePrefetchCategory = categoryHooks.usePrefetchCategory

export const usePrefetchCategories = (
  ...args: Parameters<CategoryHooks["usePrefetchCategories"]>
) => {
  const prefetch = categoryHooks.usePrefetchCategories(...args)

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
        toCategoryListParams(buildCategoryListParams(input)),
        ...prefetchArgs
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
        toCategoryListParams(buildCategoryListParams(input)),
        ...prefetchArgs
      ),
  }
}

export type { CategoryListInput }

export { buildCategoryListParams, DEFAULT_CATEGORY_PAGE_SIZE }
