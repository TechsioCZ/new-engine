"use client"

import { useEffect, useRef } from "react"
import { getCategoryDescendantIds } from "@/lib/categories/selectors"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import { useSuspenseCategoryRegistry } from "./use-category-registry"
import { usePrefetchProducts } from "./use-prefetch-products"

type UsePrefetchOnHoverReturn = {
  handleHover: (categoryHandle: string) => void
  cancelHover: () => void
}

export function usePrefetchOnHover(): UsePrefetchOnHoverReturn {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const { prefetchCategoryProducts } = usePrefetchProducts()
  const categoryRegistry = useSuspenseCategoryRegistry()

  const handleHover = (categoryHandle: string) => {
    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Schedule prefetch with delay
    timeoutRef.current = setTimeout(() => {
      const category = categoryRegistry.categoryMapByHandle[categoryHandle]

      if (category?.id) {
        const categoryIds = getCategoryDescendantIds(
          categoryRegistry,
          category.id
        )

        if (categoryIds.length === 0) {
          return
        }

        // Use categoryHandle as scopedBy for potential cancellation
        prefetchCategoryProducts(categoryIds, categoryHandle)
      }
    }, PREFETCH_DELAYS.CATEGORY_HOVER)
  }

  const cancelHover = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    },
    []
  )

  return { handleHover, cancelHover }
}
