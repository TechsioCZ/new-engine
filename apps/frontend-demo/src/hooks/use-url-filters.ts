"use client"

import {
  createParser,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import { useCallback, useMemo } from "react"
import type { FilterState } from "@/components/organisms/product-filters"
import {
  DEFAULT_PRODUCTS_PAGE_RANGE,
  type ProductsPageRange,
  parseProductsPageRange,
  serializeProductsPageRange,
} from "@/lib/url-state/products"
import type { SortOption } from "@/utils/product-filters"

export type ExtendedSortOption = SortOption | "relevance"

export type PageRange = ProductsPageRange

const SORT_VALUES = ["newest", "name-asc", "name-desc", "relevance"] as const

const parseAsPageRange = createParser<PageRange>({
  parse: parseProductsPageRange,
  serialize: serializeProductsPageRange,
  eq: (a, b) =>
    a.start === b.start && a.end === b.end && a.isRange === b.isRange,
})

const urlFilterParsers = {
  page: parseAsPageRange,
  q: parseAsString,
  categories: parseAsArrayOf(parseAsString),
  sizes: parseAsArrayOf(parseAsString),
  sort: parseAsStringLiteral(SORT_VALUES),
}

export function useUrlFilters() {
  const [queryState, setQueryState] = useQueryStates(urlFilterParsers)

  const pageRange = queryState.page ?? DEFAULT_PRODUCTS_PAGE_RANGE
  const page = pageRange.start
  const searchQuery = queryState.q ?? ""
  const sortBy: ExtendedSortOption = queryState.sort ?? "newest"

  const filters: FilterState = useMemo(
    () => ({
      categories: new Set(queryState.categories ?? []),
      sizes: new Set(queryState.sizes ?? []),
    }),
    [queryState.categories, queryState.sizes]
  )

  const setFilters = useCallback(
    (newFilters: FilterState) => {
      const categories = Array.from(newFilters.categories)
      const sizes = Array.from(newFilters.sizes)

      void setQueryState(
        {
          categories: categories.length > 0 ? categories : null,
          sizes: sizes.length > 0 ? sizes : null,
          page: null,
        },
        {
          history: "push",
          scroll: false,
        }
      )
    },
    [setQueryState]
  )

  const setSortBy = useCallback(
    (sort: ExtendedSortOption) => {
      void setQueryState(
        {
          sort,
          page: null,
        },
        {
          history: "push",
          scroll: false,
        }
      )
    },
    [setQueryState]
  )

  const setPage = useCallback(
    (newPage: number) => {
      if (!Number.isFinite(newPage)) {
        return
      }

      const normalizedPage = Math.max(1, Math.floor(newPage))

      void setQueryState(
        {
          page:
            normalizedPage > 1
              ? { start: normalizedPage, end: normalizedPage, isRange: false }
              : null,
        },
        {
          history: "push",
          scroll: true,
        }
      )
    },
    [setQueryState]
  )

  const extendPageRange = useCallback(() => {
    const nextEnd = pageRange.end + 1

    void setQueryState(
      {
        page: {
          start: pageRange.start,
          end: nextEnd,
          isRange: true,
        },
      },
      {
        history: "replace",
        scroll: false,
      }
    )
  }, [pageRange.end, pageRange.start, setQueryState])

  return {
    filters,
    setFilters,
    sortBy,
    setSortBy,
    page,
    setPage,
    pageRange,
    extendPageRange,
    searchQuery,
  }
}
