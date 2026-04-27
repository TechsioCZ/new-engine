"use client"

import { createPaginationGetPageUrl } from "@techsio/ui-kit/molecules/pagination"
import { useRouter, useSearchParams } from "next/navigation"
import type { FilterState } from "@/components/organisms/product-filters"
import type { SortOption } from "@/utils/product-filters"

export type ExtendedSortOption = SortOption | "relevance"

export type PageRange = {
  start: number
  end: number
  isRange: boolean
}

function parsePageRange(pageParam: string): PageRange {
  const parsedSinglePage = Number.parseInt(pageParam, 10)
  const singlePage = Number.isNaN(parsedSinglePage) ? 1 : parsedSinglePage

  if (!pageParam.includes("-")) {
    return { start: singlePage, end: singlePage, isRange: false }
  }

  const [start, end] = pageParam.split("-").map((p) => Number.parseInt(p, 10))

  if (!(Number.isNaN(start) || Number.isNaN(end)) && start <= end) {
    return { start, end, isRange: true }
  }

  return { start: singlePage, end: singlePage, isRange: false }
}

function parseFilterSet(value: string | null) {
  return new Set(value ? value.split(",").filter(Boolean) : [])
}

export function useUrlFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentSearchParams = searchParams.toString()

  const createParams = () => new URLSearchParams(currentSearchParams)

  // Parse page from URL (supports both single page and range syntax)
  const pageParam = searchParams.get("page") || "1"
  const pageRange = parsePageRange(pageParam)

  // Legacy single page for backward compatibility
  const page = pageRange.start

  const searchQuery = searchParams.get("q") || ""

  const categories = searchParams.get("categories")
  const sizes = searchParams.get("sizes")
  const filters: FilterState = {
    categories: parseFilterSet(categories),
    sizes: parseFilterSet(sizes),
  }

  const setFilters = (newFilters: FilterState) => {
    const params = createParams()

    const categoriesArray = Array.from(newFilters.categories)
    if (categoriesArray.length > 0) {
      params.set("categories", categoriesArray.join(","))
    } else {
      params.delete("categories")
    }

    const sizesArray = Array.from(newFilters.sizes)
    if (sizesArray.length > 0) {
      params.set("sizes", sizesArray.join(","))
    } else {
      params.delete("sizes")
    }

    // Reset to page 1 when filters change
    params.delete("page")

    router.push(`?${params.toString()}`, { scroll: false })
  }

  const sortBy = (searchParams.get("sort") || "newest") as ExtendedSortOption

  const setSortBy = (sort: ExtendedSortOption) => {
    const params = createParams()
    params.set("sort", sort)
    // Reset to page 1 when sort changes
    params.delete("page")
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const setPage = (newPage: number) => {
    const params = createParams()
    if (newPage > 1) {
      params.set("page", newPage.toString())
    } else {
      params.delete("page")
    }
    router.push(`?${params.toString()}`)
  }

  const getPageUrl = createPaginationGetPageUrl({
    pathname: "/products",
    searchParams: currentSearchParams,
  })

  const setPageRange = (startPage: number, endPage: number) => {
    const params = createParams()
    if (startPage === 1 && endPage === 1) {
      params.delete("page")
    } else if (startPage === endPage) {
      params.set("page", startPage.toString())
    } else {
      params.set("page", `${startPage}-${endPage}`)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const extendPageRange = () => {
    const newEndPage = pageRange.end + 1
    const params = createParams()
    params.set("page", `${pageRange.start}-${newEndPage}`)

    // Use replace instead of push to avoid adding to history
    // scroll: false prevents resetting scroll position
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const setSearchQuery = (query: string) => {
    const params = createParams()
    if (query) {
      params.set("q", query)
    } else {
      params.delete("q")
    }
    // Reset to first page when searching
    params.set("page", "1")
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return {
    filters,
    setFilters,
    sortBy,
    setSortBy,
    page,
    setPage,
    getPageUrl,
    pageRange,
    setPageRange,
    extendPageRange,
    searchQuery,
    setSearchQuery,
  }
}
