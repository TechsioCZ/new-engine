"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"
import type { FilterState } from "@/components/organisms/product-filters"
import type { SortOption } from "@/utils/product-filters"

export type ExtendedSortOption = SortOption | "relevance"

export interface PageRange {
  start: number
  end: number
  isRange: boolean
}

export function useUrlFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Parse page from URL (supports both single page and range syntax)
  const pageRange: PageRange = useMemo(() => {
    const pageParam = searchParams.get("page") || "1"

    if (pageParam.includes("-")) {
      const [start, end] = pageParam
        .split("-")
        .map((p) => Number.parseInt(p, 10))
      if (!(Number.isNaN(start) || Number.isNaN(end)) && start <= end) {
        return { start, end, isRange: true }
      }
    }

    const singlePage = Number.parseInt(pageParam, 10)
    return {
      start: Number.isNaN(singlePage) ? 1 : singlePage,
      end: Number.isNaN(singlePage) ? 1 : singlePage,
      isRange: false,
    }
  }, [searchParams])

  // Legacy single page for backward compatibility
  const page = pageRange.start

  // Parse search query from URL
  const searchQuery = searchParams.get("q") || ""

  // Parse filters from URL
  const filters: FilterState = useMemo(() => {
    const categories = searchParams.get("categories")
    const sizes = searchParams.get("sizes")

    return {
      categories: new Set(
        categories ? categories.split(",").filter(Boolean) : []
      ),
      sizes: new Set(sizes ? sizes.split(",").filter(Boolean) : []),
    }
  }, [searchParams])

  // Update filters in URL
  const setFilters = useCallback(
    (newFilters: FilterState) => {
      const params = new URLSearchParams(searchParams.toString())

      // Update categories
      const categoriesArray = Array.from(newFilters.categories)
      if (categoriesArray.length > 0) {
        params.set("categories", categoriesArray.join(","))
      } else {
        params.delete("categories")
      }

      // Update sizes
      const sizesArray = Array.from(newFilters.sizes)
      if (sizesArray.length > 0) {
        params.set("sizes", sizesArray.join(","))
      } else {
        params.delete("sizes")
      }

      // Reset to page 1 when filters change
      params.delete("page")

      router.push(`?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )

  // Sort state
  const sortBy = (searchParams.get("sort") || "newest") as ExtendedSortOption

  const setSortBy = useCallback(
    (sort: ExtendedSortOption) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("sort", sort)
      // Reset to page 1 when sort changes
      params.delete("page")
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )

  // Page state - supports both single page and range
  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (newPage > 1) {
        params.set("page", newPage.toString())
      } else {
        params.delete("page")
      }
      router.push(`?${params.toString()}`)
    },
    [searchParams, router]
  )

  // Set infinite page range (e.g., 1-3 for pages 1,2,3)
  const setPageRange = useCallback(
    (startPage: number, endPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (startPage === 1 && endPage === 1) {
        params.delete("page")
      } else if (startPage === endPage) {
        params.set("page", startPage.toString())
      } else {
        params.set("page", `${startPage}-${endPage}`)
      }
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )

  // Extend current page range by one page (for "load more" functionality)
  const extendPageRange = useCallback(() => {
    const newEndPage = pageRange.end + 1
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", `${pageRange.start}-${newEndPage}`)

    // Use replace instead of push to avoid adding to history
    // scroll: false prevents resetting scroll position
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [pageRange.start, pageRange.end, searchParams, router])

  // Update search query in URL
  const setSearchQuery = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (query) {
        params.set("q", query)
      } else {
        params.delete("q")
      }
      // Reset to first page when searching
      params.set("page", "1")
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )

  return {
    filters,
    setFilters,
    sortBy,
    setSortBy,
    page,
    setPage,
    pageRange,
    setPageRange,
    extendPageRange,
    searchQuery,
    setSearchQuery,
  }
}
