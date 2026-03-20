"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import {
  getCategoryChildren,
  getCategoryDescendantIds,
} from "@/lib/categories/selectors"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { useSuspenseCategoryRegistry } from "./use-category-registry"
import { usePrefetchProducts } from "./use-prefetch-products"
import { useRegion } from "./use-region"

type UsePrefetchCategoryChildrenParams = {
  enabled?: boolean
  categoryHandle: string
}

export function usePrefetchCategoryChildren({
  enabled = true,
  categoryHandle,
}: UsePrefetchCategoryChildrenParams) {
  const queryClient = useQueryClient()
  const categoryRegistry = useSuspenseCategoryRegistry()
  const currentCategory = categoryRegistry.categoryMapByHandle[categoryHandle]
  const { regionId } = useRegion()
  const { prefetchCategoryProducts } = usePrefetchProducts()

  useEffect(() => {
    if (!(enabled && currentCategory && regionId)) {
      return
    }

    let isCancelled = false

    // Collect all category IDs that will be prefetched
    const children = getCategoryChildren(categoryRegistry, currentCategory.id)
    ;(async () => {
      // PHASE 1: Direct children - wait for completion
      if (children.length > 0) {
        const childHandles = children.map((c) => c.handle).join(", ")
        prefetchLogger.info("Children", `Phase 1: ${childHandles}`)

        await Promise.all(
          children.map((child) => {
            const categoryIds = getCategoryDescendantIds(
              categoryRegistry,
              child.id
            )

            if (categoryIds.length > 0) {
              return prefetchCategoryProducts(categoryIds, categoryHandle)
            }
            return Promise.resolve()
          })
        )

        if (isCancelled) {
          return
        }
        prefetchLogger.info("Children", "Phase 1 complete")
      }
    })()

    return () => {
      isCancelled = true

      // Cancel ongoing prefetch requests for this category's children
      // Uses meta scope to avoid canceling queries from other categories
      queryClient.cancelQueries({
        predicate: (query) => {
          // ✅ Only cancel queries prefetched by THIS categoryHandle
          return query.meta?.prefetchedBy === categoryHandle
        },
      })

      prefetchLogger.info(
        "Children",
        `Cancelled prefetches for ${categoryHandle}`
      )
    }
  }, [
    enabled,
    categoryHandle,
    regionId,
    categoryRegistry,
    currentCategory,
    prefetchCategoryProducts,
    queryClient,
  ])
}
