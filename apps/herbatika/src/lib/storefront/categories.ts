"use client"

import type {
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
} from "@techsio/storefront-data/categories/medusa-service"
import { useLocale } from "next-intl"
import type { CategoryListInput as StorefrontCategoryListInput } from "./category-query-config"
import {
  buildCategoryListParams as buildStorefrontCategoryListParams,
  DEFAULT_CATEGORY_PAGE_SIZE as STOREFRONT_DEFAULT_CATEGORY_PAGE_SIZE,
} from "./category-query-config"
import { withRequestLocale } from "./localized-query"
import { storefront } from "./storefront"

export type CategoryListInput = StorefrontCategoryListInput
export const DEFAULT_CATEGORY_PAGE_SIZE = STOREFRONT_DEFAULT_CATEGORY_PAGE_SIZE
export const buildCategoryListParams = buildStorefrontCategoryListParams

type CategoryHooks = typeof storefront.hooks.categories

const categoryHooks = storefront.hooks.categories
const toCategoryListParams = (
  input: CategoryListInput
): MedusaCategoryListInput => input as unknown as MedusaCategoryListInput

export const useCategories = (
  input: CategoryListInput,
  options?: Parameters<CategoryHooks["useCategories"]>[1]
) => {
  const locale = useLocale()

  return categoryHooks.useCategories(
    toCategoryListParams(
      buildCategoryListParams(withRequestLocale(input, locale))
    ),
    options
  )
}

export const usePrefetchCategory = (
  ...args: Parameters<CategoryHooks["usePrefetchCategory"]>
) => {
  const locale = useLocale()
  const prefetch = categoryHooks.usePrefetchCategory(...args)

  return {
    ...prefetch,
    prefetchCategory: (
      input: MedusaCategoryDetailInput,
      ...prefetchArgs: Parameters<typeof prefetch.prefetchCategory> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.prefetchCategory(
        withRequestLocale(input, locale),
        ...prefetchArgs
      ),
    delayedPrefetch: (
      input: MedusaCategoryDetailInput,
      ...prefetchArgs: Parameters<typeof prefetch.delayedPrefetch> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.delayedPrefetch(
        withRequestLocale(input, locale),
        ...prefetchArgs
      ),
  }
}

export const usePrefetchCategories = (
  ...args: Parameters<CategoryHooks["usePrefetchCategories"]>
) => {
  const locale = useLocale()
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
        toCategoryListParams(
          buildCategoryListParams(withRequestLocale(input, locale))
        ),
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
        toCategoryListParams(
          buildCategoryListParams(withRequestLocale(input, locale))
        ),
        ...prefetchArgs
      ),
  }
}
