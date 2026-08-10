"use client"

import { useEffect, useRef } from "react"

import { ALL_CATEGORIES_MAP } from "@/lib/constants"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"

import { usePrefetchProducts } from "./use-prefetch-products"

interface UsePrefetchOnHoverReturn {
  handleHover: (categoryHandle: string) => void
  cancelHover: () => void
}

export const usePrefetchOnHover = (): UsePrefetchOnHoverReturn => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { prefetchCategoryProducts } = usePrefetchProducts()

  const handleHover = (categoryHandle: string) => {
    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Schedule prefetch with delay
    timeoutRef.current = setTimeout(() => {
      const categoryIds = ALL_CATEGORIES_MAP[categoryHandle]

      if (process.env.NODE_ENV === "development") {
        console.log(
          "[usePrefetchOnHover] Prefetch:",
          categoryHandle,
          categoryIds,
        )
      }

      if (
        categoryIds !== null &&
        categoryIds !== undefined &&
        categoryIds.length > 0
      ) {
        // Use categoryHandle as scopedBy for potential cancellation
        void prefetchCategoryProducts(categoryIds, categoryHandle)
      }
    }, PREFETCH_DELAYS.CATEGORY_HOVER)
  }

  const cancelHover = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    },
    [],
  )

  return { cancelHover, handleHover }
}
