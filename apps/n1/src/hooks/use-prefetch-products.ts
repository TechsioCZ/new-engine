import { useQueryClient } from "@tanstack/react-query"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import { buildPrefetchParams } from "@/lib/product-query-params"
import { queryKeys } from "@/lib/query-keys"
import { buildCategoryPrefetchLabels, runLoggedPrefetch } from "./prefetch-utils"
import { productHooks } from "./product-hooks-base"
import { useRegion } from "./use-region"

export function usePrefetchProducts() {
  const { regionId, countryCode } = useRegion()
  const queryClient = useQueryClient()
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

    const queryParams = buildPrefetchParams({
      category_id: categoryId,
      region_id: regionId,
      country_code: countryCode,
    })

    const queryKey = queryKeys.products.list(queryParams)

    await runLoggedPrefetch({
      queryClient,
      queryKey,
      type: "Categories",
      label: labels.requestLabel,
      cacheHitLabel: labels.cacheHitLabel,
      prefetch: () =>
        prefetchProductsBase(
          {
            category_id: categoryId,
            page: 1,
            region_id: regionId,
            country_code: countryCode,
          },
          {
            prefetchedBy,
          }
        ),
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

    const queryParams = buildPrefetchParams({
      category_id: categoryId,
      region_id: regionId,
      country_code: countryCode,
    })

    const queryKey = queryKeys.products.list(queryParams)

    await runLoggedPrefetch({
      queryClient,
      queryKey,
      type: "Root",
      label: labels.requestLabel,
      cacheHitLabel: labels.cacheHitLabel,
      prefetch: () =>
        prefetchFirstPage(
          {
            category_id: categoryId,
            region_id: regionId,
            country_code: countryCode,
          },
          {
            useGlobalFetcher: true,
          }
        ),
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
    delayedPrefetchBase(
      {
        category_id: categoryId,
        page: 1,
        region_id: regionId,
        country_code: countryCode,
      },
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
