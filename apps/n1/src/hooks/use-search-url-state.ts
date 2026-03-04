"use client"

import { useQueryStates } from "nuqs"
import {
  normalizeCategoryId,
  normalizeSearchPage,
  normalizeSearchQuery,
  searchUrlParsers,
  toCategoryIdQueryParam,
  toPageQueryParam,
} from "@/lib/url-state/search"

const NAVIGATION_OPTIONS = {
  history: "push" as const,
  scroll: true,
}

export function useSearchUrlState() {
  const [state, setSearchState] = useQueryStates(searchUrlParsers)

  const query = normalizeSearchQuery(state.q)
  const page = normalizeSearchPage(state.page)
  const categoryId = normalizeCategoryId(state.category_id)

  const setPage = (nextPage: number) => {
    void setSearchState(
      {
        page: toPageQueryParam(nextPage),
      },
      NAVIGATION_OPTIONS
    )
  }

  const setCategory = (nextCategoryId: string) => {
    void setSearchState(
      {
        category_id: toCategoryIdQueryParam(nextCategoryId),
        page: null,
      },
      NAVIGATION_OPTIONS
    )
  }

  const clearCategory = () => {
    void setSearchState(
      {
        category_id: null,
        page: null,
      },
      NAVIGATION_OPTIONS
    )
  }

  return {
    query,
    page,
    categoryId,
    setPage,
    setCategory,
    clearCategory,
  }
}
