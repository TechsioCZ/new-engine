"use client"

import { useEffect, useState } from "react"

import {
  createEmptySearchAutocompleteResponse,
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
  regionId?: string
}

interface UseSearchAutocompleteResult {
  data: SearchAutocompleteResponse
  status: SearchAutocompleteStatus
}

export function useSearchAutocomplete({
  countryCode,
  query,
  currencyCode,
  regionId,
}: UseSearchAutocompleteInput): UseSearchAutocompleteResult {
  const normalizedQuery = query
    .trim()
    .slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)
  const [data, setData] = useState<SearchAutocompleteResponse>(
    createEmptySearchAutocompleteResponse(""),
  )
  const [status, setStatus] = useState<SearchAutocompleteStatus>("idle")

  useEffect(() => {
    if (normalizedQuery.length < SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
      setData(createEmptySearchAutocompleteResponse(normalizedQuery))
      setStatus("idle")
      return
    }

    setData(createEmptySearchAutocompleteResponse(normalizedQuery))
    setStatus("loading")

    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams({
        currency: currencyCode,
        q: normalizedQuery,
      })

      if (countryCode) {
        params.set("country", countryCode)
      }

      if (regionId) {
        params.set("region", regionId)
      }

      fetch(`/api/search-autocomplete?${params.toString()}`, {
        signal: abortController.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Autocomplete failed: ${response.status}`)
          }

          return response.json() as Promise<SearchAutocompleteResponse>
        })
        .then((response) => {
          setData(response)
          setStatus("success")
        })
        .catch((error: unknown) => {
          if (abortController.signal.aborted) {
            return
          }

          console.error("Search autocomplete request failed", error)
          setData(createEmptySearchAutocompleteResponse(normalizedQuery))
          setStatus("error")
        })
    }, SEARCH_AUTOCOMPLETE_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [countryCode, currencyCode, normalizedQuery, regionId])

  return { data, status }
}
