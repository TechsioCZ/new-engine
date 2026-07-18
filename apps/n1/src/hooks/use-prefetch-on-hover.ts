"use client"

import { useEffect, useRef } from "react"

import { ALL_CATEGORIES_MAP } from "@/lib/constants"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"

import { usePrefetchProducts } from "./use-prefetch-products"

type UsePrefetchOnHoverReturn = {
  handleHover: (categoryHandle: string) => void
  cancelHover: () => void
}

export function usePrefetchOnHover(): UsePrefetchOnHoverReturn {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const { prefetchCategoryProducts } = usePrefetchProducts()

  const handleHover = (categoryHandle: string) => {
    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Schedule prefetch with delay
    timeoutRef.current = setTimeout(() => {
      const categoryIds = ALL_CATEGORIES_MAP[categoryHandle]

      if (process.env["NODE_ENV"] === "development") {
        console.log(
          "[usePrefetchOnHover] Prefetch:",
          categoryHandle,
          categoryIds
        )
      }

      if (categoryIds?.length) {
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
