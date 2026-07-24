"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { cacheConfig } from "@/lib/cache-config"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { buildProductQueryParams } from "@/lib/product-query-params"
import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "@/services/product-service"

type UsePrefetchPagesParams = {
  enabled?: boolean
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalPages: number
  pageSize: number
  category_id: string[]
  regionId?: string
  countryCode?: string
}

const MEDIUM_PRIORITY_DELAY = 500
const LOW_PRIORITY_DELAY = 1500

export function usePrefetchPages({
  enabled = true,
  currentPage,
  hasNextPage,
  hasPrevPage,
  totalPages,
  pageSize,
  category_id,
  regionId,
  countryCode,
}: UsePrefetchPagesParams) {
  const queryClient = useQueryClient()

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: prefetch scheduling has multiple priority branches
  useEffect(() => {
    if (!(enabled && regionId)) {
      return
    }

    const categoryName = category_id[0]?.slice(-6) || "unknown"
    const timers: NodeJS.Timeout[] = []

    // Helper: Prefetch batch of pages with logging
    const prefetchBatch = (pages: number[], priority: string) => {
      if (pages.length === 0) {
        return
      }

      const pageLabels = pages.map((p) => `p${p}`).join(", ")
      const start = performance.now()

      prefetchLogger.start(
        "Pages",
        `${categoryName}: ${pageLabels} (${priority})`
      )

      void Promise.all(
        pages.map((page) => {
          const queryParams = buildProductQueryParams({
            category_id,
            region_id: regionId,
            ...(countryCode ? { country_code: countryCode } : {}),
            page,
            limit: pageSize,
          })

          return queryClient.prefetchQuery({
            queryKey: queryKeys.products.list(queryParams),
            queryFn: ({ signal }) => getProducts(queryParams, signal),
            ...cacheConfig.semiStatic,
          })
        })
      ).then(() => {
        const duration = performance.now() - start
        prefetchLogger.complete(
          "Pages",
          `${categoryName}: ${pageLabels} (${priority})`,
          duration
        )
      })
    }

    // Build priority groups
    const high = hasNextPage ? [currentPage + 1] : []

    const medium =
      hasNextPage && currentPage + 2 <= totalPages ? [currentPage + 2] : []

    const lowCandidates = [
      // previous page
      hasPrevPage ? currentPage - 1 : null,
      // first page
      currentPage !== 1 ? 1 : null,
      // last page
      totalPages > 1 && currentPage !== totalPages ? totalPages : null,
    ].filter((p): p is number => p !== null)

    const low = [...new Set(lowCandidates)] // Deduplicate (e.g., p2: prev=1, first=1)

    // Execute with priority delays
    // HIGH: Immediate (0ms)
    prefetchBatch(high, "high")

    // MEDIUM: 200ms delay
    if (medium.length > 0) {
      timers.push(
        setTimeout(() => {
          prefetchBatch(medium, "medium")
        }, MEDIUM_PRIORITY_DELAY)
      )
    }

    // LOW: 1000ms delay
    if (low.length > 0) {
      timers.push(
        setTimeout(() => {
          prefetchBatch(low, "low")
        }, LOW_PRIORITY_DELAY)
      )
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer)
      }
    }
  }, [
    enabled,
    currentPage,
    hasNextPage,
    hasPrevPage,
    totalPages,
    pageSize,
    category_id,
    regionId,
    countryCode,
    queryClient,
  ])
}
