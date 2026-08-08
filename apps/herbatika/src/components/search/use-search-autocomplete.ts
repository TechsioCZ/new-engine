"use client"

import { useQuery } from "@tanstack/react-query"
import { useLocale } from "next-intl"
import { useEffect, useState } from "react"

import {
  createEmptySearchAutocompleteResponse,
  parseSearchAutocompleteResponse,
  SEARCH_AUTOCOMPLETE_DEBOUNCE_MS,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import type {
  SearchAutocompleteResponse,
  SearchAutocompleteStatus,
} from "@/lib/search-autocomplete/search-autocomplete-types"

interface UseSearchAutocompleteInput {
  countryCode?: string
  query: string
  currencyCode: string
  enabled: boolean
  regionId?: string
}

interface UseSearchAutocompleteResult {
  data: SearchAutocompleteResponse
  status: SearchAutocompleteStatus
}

const useDebouncedValue = (value: string) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, SEARCH_AUTOCOMPLETE_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [value])

  return debouncedValue
}

export const useSearchAutocomplete = ({
  countryCode,
  query,
  currencyCode,
  enabled,
  regionId,
}: UseSearchAutocompleteInput): UseSearchAutocompleteResult => {
  const locale = useLocale()
  const normalizedQuery = query
    .trim()
    .slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)
  const requestKey = JSON.stringify([
    normalizedQuery,
    countryCode,
    currencyCode,
    locale,
    regionId,
  ])
  const debouncedRequestKey = useDebouncedValue(requestKey)
  const hasSearchableQuery =
    normalizedQuery.length === 0 ||
    normalizedQuery.length >= SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH
  const isQueryEligible = enabled && hasSearchableQuery
  const isDebouncePending = debouncedRequestKey !== requestKey
  const autocompleteQuery = useQuery({
    enabled: isQueryEligible && !isDebouncePending,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        currency: currencyCode,
        locale,
        q: normalizedQuery,
      })

      if (countryCode !== undefined && countryCode !== "") {
        params.set("country", countryCode)
      }

      if (regionId !== undefined && regionId !== "") {
        params.set("region", regionId)
      }

      const response = await fetch(
        `/api/search-autocomplete?${params.toString()}`,
        { signal },
      )
      if (!response.ok) {
        throw new Error(`Autocomplete failed: ${response.status}`)
      }

      const payload: unknown = await response.json()
      return parseSearchAutocompleteResponse(payload)
    },
    queryKey: ["search-autocomplete", debouncedRequestKey],
    retry: false,
  })

  if (!isQueryEligible) {
    return {
      data: createEmptySearchAutocompleteResponse(normalizedQuery),
      status: "idle",
    }
  }

  if (isDebouncePending || autocompleteQuery.isPending) {
    return {
      data: createEmptySearchAutocompleteResponse(normalizedQuery),
      status: "loading",
    }
  }

  if (autocompleteQuery.isError) {
    return {
      data: createEmptySearchAutocompleteResponse(normalizedQuery),
      status: "error",
    }
  }

  return {
    data:
      autocompleteQuery.data ??
      createEmptySearchAutocompleteResponse(normalizedQuery),
    status: "success",
  }
}
