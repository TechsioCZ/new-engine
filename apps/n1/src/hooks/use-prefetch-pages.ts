"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { cacheConfig } from "@/lib/cache-config"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { buildProductQueryParams } from "@/lib/product-query-params"
import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "@/services/product-service"

interface UsePrefetchPagesParams {
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

const schedulePrefetchBatch = (
  prefetch: () => void,
  delay: number,
): NodeJS.Timeout => setTimeout(prefetch, delay)

const getCategoryName = (categoryIds: string[]): string => {
  const name = categoryIds[0]?.slice(-6)
  return name === "" ? "unknown" : (name ?? "unknown")
}

export const usePrefetchPages = ({
  enabled = true,
  currentPage,
  hasNextPage,
  hasPrevPage,
  totalPages,
  pageSize,
  category_id,
  regionId,
  countryCode,
}: UsePrefetchPagesParams) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    const canPrefetch = enabled && regionId !== undefined && regionId !== ""

    const categoryName = getCategoryName(category_id)
    // Helper: Prefetch batch of pages with logging
    const prefetchBatch = async (pages: number[], priority: string) => {
      if (pages.length === 0 || regionId === undefined || regionId === "") {
        return
      }

      const pageLabels = pages.map((page) => `p${page}`).join(", ")
      const start = performance.now()
      prefetchLogger.start(
        "Pages",
        `${categoryName}: ${pageLabels} (${priority})`,
      )

      const requests: Promise<void>[] = []
      for (const page of pages) {
        const queryParams = buildProductQueryParams({
          category_id,
          ...(countryCode !== undefined &&
          countryCode !== null &&
          countryCode !== ""
            ? { country_code: countryCode }
            : {}),
          limit: pageSize,
          page,
          region_id: regionId,
        })
        requests.push(
          queryClient.prefetchQuery({
            ...cacheConfig.semiStatic,
            queryFn: async ({ signal }) =>
              await getProducts(queryParams, signal),
            queryKey: queryKeys.products.list(queryParams),
          }),
        )
      }
      await Promise.all(requests)

      const duration = performance.now() - start
      prefetchLogger.complete(
        "Pages",
        `${categoryName}: ${pageLabels} (${priority})`,
        duration,
      )
    }

    // Build priority groups
    const high = canPrefetch && hasNextPage ? [currentPage + 1] : []

    const medium =
      canPrefetch && hasNextPage && currentPage + 2 <= totalPages
        ? [currentPage + 2]
        : []

    const lowCandidates = [
      // previous page
      canPrefetch && hasPrevPage ? currentPage - 1 : null,
      // first page
      !canPrefetch || currentPage === 1 ? null : 1,
      // last page
      canPrefetch && totalPages > 1 && currentPage !== totalPages
        ? totalPages
        : null,
    ].filter((p): p is number => p !== null)

    // Deduplicate overlapping candidates (for example, page 2 has the same previous and first page).
    const low = [...new Set(lowCandidates)]

    // Execute with priority delays
    // HIGH: Immediate (0ms)
    void prefetchBatch(high, "high")

    // MEDIUM: 200ms delay
    if (medium.length > 0) {
      timers.push(
        schedulePrefetchBatch(() => {
          void prefetchBatch(medium, "medium")
        }, MEDIUM_PRIORITY_DELAY),
      )
    }

    // LOW: 1000ms delay
    if (low.length > 0) {
      timers.push(
        schedulePrefetchBatch(() => {
          void prefetchBatch(low, "low")
        }, LOW_PRIORITY_DELAY),
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
