"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { queryKeys } from "@/lib/query-keys"
import { useRegion } from "@/hooks/use-region"
import {
  type BrandSuggestion,
  type CategorySuggestion,
  getSearchSuggestions,
  type ProductSuggestion,
  type SearchSuggestions,
} from "@/services/search-suggestions-service"

type UseSearchSuggestionsOptions = {
  query: string
  enabled?: boolean
  debounceMs?: number
  minQueryLength?: number
  limitPerSection?: number
}

type UseSearchSuggestionsResult = {
  suggestions: SearchSuggestions
  isLoading: boolean
  isError: boolean
  hasAnySuggestions: boolean
}

const EMPTY_SUGGESTIONS: SearchSuggestions = {
  products: [],
  categories: [],
  brands: [],
}

const DEFAULT_DEBOUNCE_MS = 170
const DEFAULT_MIN_QUERY_LENGTH = 2
const DEFAULT_LIMIT_PER_SECTION = 5
const SUGGESTIONS_STALE_TIME_MS = 2 * 60 * 1000
const SUGGESTIONS_GC_TIME_MS = 15 * 60 * 1000

function hasSuggestions(
  products: ProductSuggestion[],
  categories: CategorySuggestion[],
  brands: BrandSuggestion[]
): boolean {
  return products.length > 0 || categories.length > 0 || brands.length > 0
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(timeout)
    }
  }, [delayMs, value])

  return debouncedValue
}

export function useSearchSuggestions({
  query,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  minQueryLength = DEFAULT_MIN_QUERY_LENGTH,
  limitPerSection = DEFAULT_LIMIT_PER_SECTION,
}: UseSearchSuggestionsOptions): UseSearchSuggestionsResult {
  const trimmedQuery = query.trim()
  const debouncedQuery = useDebouncedValue(trimmedQuery, debounceMs)
  const { regionId, countryCode } = useRegion()
  const shouldSearch =
    enabled && debouncedQuery.length >= minQueryLength && Boolean(regionId)

  const suggestionsQuery = useQuery({
    queryKey: queryKeys.search.suggestions({
      q: debouncedQuery,
      limitPerSection,
      regionId,
      countryCode,
    }),
    queryFn: ({ signal }) =>
      getSearchSuggestions(debouncedQuery, {
        signal,
        limitPerSection,
        regionId,
        countryCode,
      }),
    enabled: shouldSearch,
    staleTime: SUGGESTIONS_STALE_TIME_MS,
    gcTime: SUGGESTIONS_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0,
    placeholderData: (previousData) => previousData,
  })

  const suggestions =
    shouldSearch && suggestionsQuery.data
      ? suggestionsQuery.data
      : EMPTY_SUGGESTIONS
  const isLoading = shouldSearch
    ? suggestionsQuery.isPending || suggestionsQuery.isFetching
    : false
  const isError = shouldSearch ? suggestionsQuery.isError : false

  const hasAnySuggestions = useMemo(
    () =>
      hasSuggestions(
        suggestions.products,
        suggestions.categories,
        suggestions.brands
      ),
    [suggestions.brands, suggestions.categories, suggestions.products]
  )

  return {
    suggestions,
    isLoading,
    isError,
    hasAnySuggestions,
  }
}
