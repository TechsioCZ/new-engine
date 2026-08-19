"use client"

import { useLocale } from "next-intl"
import { useEffect, useState } from "react"
import {
  createEmptySearchAutocompleteResponse,
  SEARCH_AUTOCOMPLETE_DEBOUNCE_MS,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  type SearchAutocompleteResponse,
  type SearchAutocompleteStatus,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import {
  projectSearchAutocompleteResponse,
  type SearchPublicSlugMaps,
} from "./public-search-suggestions"

type UseSearchAutocompleteInput = SearchPublicSlugMaps & {
  countryCode?: string
  query: string
  currencyCode: string
  enabled: boolean
  regionId?: string
}

type UseSearchAutocompleteResult = {
  data: SearchAutocompleteResponse
  status: SearchAutocompleteStatus
}

export function useSearchAutocomplete({
  articlePublicSlugsById,
  brandPublicSlugsById,
  categoryPublicSlugsById,
  countryCode,
  query,
  currencyCode,
  enabled,
  productPublicSlugsById,
  regionId,
}: UseSearchAutocompleteInput): UseSearchAutocompleteResult {
  const { code: market } = useMarketContext()
  const locale = useLocale()
  const normalizedQuery = query
    .trim()
    .slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)
  const [data, setData] = useState<SearchAutocompleteResponse>(
    createEmptySearchAutocompleteResponse("")
  )
  const [status, setStatus] = useState<SearchAutocompleteStatus>("idle")

  useEffect(() => {
    if (!enabled) {
      setData(createEmptySearchAutocompleteResponse(normalizedQuery))
      setStatus("idle")
      return
    }

    if (
      normalizedQuery.length > 0 &&
      normalizedQuery.length < SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH
    ) {
      setData(createEmptySearchAutocompleteResponse(normalizedQuery))
      setStatus("idle")
      return
    }

    setData(createEmptySearchAutocompleteResponse(normalizedQuery))
    setStatus("loading")

    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams({
        q: normalizedQuery,
        currency: currencyCode,
        locale,
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
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Autocomplete failed: ${response.status}`)
          }

          return response.json() as Promise<SearchAutocompleteResponse>
        })
        .then((response) => {
          setData(
            projectSearchAutocompleteResponse(
              response,
              {
                articlePublicSlugsById,
                brandPublicSlugsById,
                categoryPublicSlugsById,
                productPublicSlugsById,
              },
              market
            )
          )
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
  }, [
    articlePublicSlugsById,
    brandPublicSlugsById,
    categoryPublicSlugsById,
    countryCode,
    currencyCode,
    enabled,
    locale,
    market,
    normalizedQuery,
    productPublicSlugsById,
    regionId,
  ])

  return { data, status }
}
