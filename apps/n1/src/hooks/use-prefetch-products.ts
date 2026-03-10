import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import { buildCategoryPrefetchLabels, runLoggedPrefetch } from "./prefetch-utils"
import { storefront } from "./storefront-preset"

export function usePrefetchProducts() {
  const region = useRegionContext()
  const regionId = region?.region_id
  const countryCode = region?.country_code
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
    categoryId: string[],
    prefetchedBy?: string
  ) => {
    if (!regionId) {
      return
    }
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
      type: "Categories",
      label: labels.requestLabel,
      prefetch: () =>
        prefetchProductsBase(queryInput, {
          prefetchedBy,
        }),
    })
  }

  const prefetchRootCategories = async (categoryId: string[]) => {
    if (!regionId) {
      return
    }
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
    categoryId: string[],
    delay: number = PREFETCH_DELAYS.CATEGORY_LIST
  ) => {
    if (!regionId) {
      return categoryId.join("-")
    }

    const id = categoryId.join("-")
    const queryInput = {
      category_id: categoryId,
      region_id: regionId,
      country_code: countryCode,
    }
    delayedPrefetchBase(
      queryInput,
      delay,
      id
    )
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
