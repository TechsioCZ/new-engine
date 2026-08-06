"use client"

import { createPaginationGetPageUrl } from "@techsio/ui-kit/molecules/pagination"
import { useRouter, useSearchParams } from "next/navigation"

import type { FilterState } from "@/components/organisms/product-filters"
import type { SortOption } from "@/utils/product-filters"

export type ExtendedSortOption = SortOption | "relevance"

export interface PageRange {
  start: number
  end: number
  isRange: boolean
}

const parsePageRange = (pageParam: string): PageRange => {
  const parsedSinglePage = Number(pageParam)
  const singlePage =
    Number.isInteger(parsedSinglePage) && parsedSinglePage >= 1
      ? parsedSinglePage
      : 1

  if (!pageParam.includes("-")) {
    return { end: singlePage, isRange: false, start: singlePage }
  }

  const [startPart, endPart] = pageParam.split("-")
  const start = Number(startPart)
  const end = Number(endPart)

  if (!(Number.isInteger(start) && Number.isInteger(end))) {
    return { end: singlePage, isRange: false, start: singlePage }
  }

  if (start >= 1 && end >= 1 && start <= end) {
    return { end, isRange: true, start }
  }

  return { end: singlePage, isRange: false, start: singlePage }
}

const parseFilterSet = (value: string | null): Set<string> => {
  if (value === null || value.length === 0) {
    return new Set()
  }

  return new Set(value.split(",").filter((part) => part.length > 0))
}

const isExtendedSortOption = (value: string): value is ExtendedSortOption =>
  value === "name-asc" ||
  value === "name-desc" ||
  value === "newest" ||
  value === "relevance"

export const useUrlFilters = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentSearchParams = searchParams.toString()

  const createParams = () => new URLSearchParams(currentSearchParams)

  // Parse page from URL (supports both single page and range syntax)
  const pageParam = searchParams.get("page") ?? "1"
  const pageRange = parsePageRange(pageParam)

  // Legacy single page for backward compatibility
  const page = pageRange.start

  const searchQuery = searchParams.get("q") ?? ""

  const categories = searchParams.get("categories")
  const sizes = searchParams.get("sizes")
  const filters: FilterState = {
    categories: parseFilterSet(categories),
    sizes: parseFilterSet(sizes),
  }

  const setFilters = (newFilters: FilterState) => {
    const params = createParams()

    const categoriesArray = [...newFilters.categories]
    if (categoriesArray.length > 0) {
      params.set("categories", categoriesArray.join(","))
    } else {
      params.delete("categories")
    }

    const sizesArray = [...newFilters.sizes]
    if (sizesArray.length > 0) {
      params.set("sizes", sizesArray.join(","))
    } else {
      params.delete("sizes")
    }

    // Reset to page 1 when filters change
    params.delete("page")

    router.push(`?${params.toString()}`, { scroll: false })
  }

  const sortParam = searchParams.get("sort")
  const sortBy =
    sortParam !== null && isExtendedSortOption(sortParam) ? sortParam : "newest"

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
    if (query.length > 0) {
      params.set("q", query)
    } else {
      params.delete("q")
    }
    // Reset to first page when searching
    params.set("page", "1")
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return {
    extendPageRange,
    filters,
    getPageUrl,
    page,
    pageRange,
    searchQuery,
    setFilters,
    setPage,
    setPageRange,
    setSearchQuery,
    setSortBy,
    sortBy,
  }
}
