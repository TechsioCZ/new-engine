"use client"

import { PRODUCT_LIMIT } from "@/lib/constants"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import {
  buildCategoryPrefetchLabels,
  runLoggedPrefetch,
} from "./prefetch-utils"
import { storefront } from "./storefront-preset"
import { useRegion } from "./use-region"

type CategoryInput = string | string[]

const normalizeCategoryInput = (categoryInput: CategoryInput): string[] =>
  Array.isArray(categoryInput) ? categoryInput : [categoryInput]

export function usePrefetchProducts() {
  const { regionId, countryCode } = useRegion()
  const productHooks = storefront.hooks.products
  const {
    prefetchProducts: prefetchProductsBase,
    prefetchFirstPage,
    delayedPrefetch: delayedPrefetchBase,
    cancelPrefetch: cancelPrefetchBase,
  } = productHooks.usePrefetchProducts({
    cacheStrategy: "semiStatic",
    skipIfCached: true,
    skipMode: "any",
  })

  const prefetchCategoryProducts = async (
    categoryInput: CategoryInput,
    prefetchedBy?: string
  ) => {
    if (!regionId) {
      return
    }

    const categoryId = normalizeCategoryInput(categoryInput)
    const labels = buildCategoryPrefetchLabels(categoryId)
    if (!labels) {
      return
    }

    const queryInput = {
      category_id: categoryId,
      region_id: regionId,
      country_code: countryCode,
      limit: PRODUCT_LIMIT,
      offset: 0,
    }

    await runLoggedPrefetch({
      type: "Categories",
      label: labels.requestLabel,
      prefetch: () =>
        prefetchProductsBase(queryInput, {
          prefetchedBy,
        }),
    })
  }

  const prefetchRootCategories = async (categoryInput: CategoryInput) => {
    if (!regionId) {
      return
    }

    const categoryId = normalizeCategoryInput(categoryInput)
    const labels = buildCategoryPrefetchLabels(categoryId)
    if (!labels) {
      return
    }

    const queryInput = {
      category_id: categoryId,
      region_id: regionId,
      country_code: countryCode,
    }

    await runLoggedPrefetch({
      type: "Root",
      label: labels.requestLabel,
      prefetch: () =>
        prefetchFirstPage(queryInput, {
          useGlobalFetcher: true,
        }),
    })
  }

  const delayedPrefetch = (
    categoryInput: CategoryInput,
    delay: number = PREFETCH_DELAYS.CATEGORY_LIST
  ) => {
    const categoryId = normalizeCategoryInput(categoryInput)

    if (!regionId) {
      return categoryId.join("-")
    }

    const id = categoryId.join("-")
    const queryInput = {
      category_id: categoryId,
      region_id: regionId,
      country_code: countryCode,
    }
    delayedPrefetchBase(queryInput, delay, id)
    return id
  }

  const cancelPrefetch = (prefetchId: string) => {
    cancelPrefetchBase(prefetchId)
  }

  return {
    prefetchCategoryProducts,
    prefetchRootCategories,
    delayedPrefetch,
    cancelPrefetch,
  }
}
