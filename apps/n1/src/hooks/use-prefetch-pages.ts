"use client"

import { useEffect } from "react"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import { productHooks } from "./product-hooks-base"

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
  const { prefetchProducts } = productHooks.usePrefetchProducts({
    cacheStrategy: "semiStatic",
    skipIfCached: true,
    skipMode: "any",
  })

  useEffect(() => {
    if (!(enabled && regionId && category_id.length > 0)) {
      return
    }

    const categoryName = category_id[0]?.slice(-6) || "unknown"
    const timers: ReturnType<typeof setTimeout>[] = []

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

      Promise.allSettled(
        pages.map((page) =>
          prefetchProducts(
            {
              category_id,
              region_id: regionId,
              country_code: countryCode,
              page,
              limit: pageSize,
            },
            {
              skipIfCached: true,
              skipMode: "any",
            }
          )
        )
      ).then(() => {
        const duration = performance.now() - start
        prefetchLogger.complete(
          "Pages",
          `${categoryName}: ${pageLabels} (${priority})`,
          duration
        )
      })
    }

    const high = hasNextPage ? [currentPage + 1] : []

    const medium =
      hasNextPage && currentPage + 2 <= totalPages ? [currentPage + 2] : []

    const lowCandidates = [
      hasPrevPage ? currentPage - 1 : null,
      currentPage !== 1 ? 1 : null,
      totalPages > 1 && currentPage !== totalPages ? totalPages : null,
    ].filter((page): page is number => page !== null)

    const low = Array.from(new Set(lowCandidates))

    prefetchBatch(high, "high")

    if (medium.length > 0) {
      timers.push(
        setTimeout(() => {
          prefetchBatch(medium, "medium")
        }, PREFETCH_DELAYS.PAGES.MEDIUM)
      )
    }

    if (low.length > 0) {
      timers.push(
        setTimeout(() => {
          prefetchBatch(low, "low")
        }, PREFETCH_DELAYS.PAGES.LOW)
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
    prefetchProducts,
  ])
}
