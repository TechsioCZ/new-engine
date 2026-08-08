import "server-only"
import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
} from "@/lib/storefront/ssr/constants"

import { normalizeString } from "./search-autocomplete-normalizers"
import { parseCatalogAutocompleteResponse } from "./search-autocomplete-response-validator"

const CATALOG_FETCH_TIMEOUT_MS = 3000

interface CatalogCandidatesInput {
  countryCode?: string | null
  currencyCode: string
  locale?: string | null
  query: string
  regionId?: string | null
}

const createCatalogAutocompleteUrl = ({
  countryCode,
  currencyCode,
  locale,
  query,
  regionId,
}: CatalogCandidatesInput) => {
  const url = new URL("/store/search/autocomplete", MEDUSA_BACKEND_URL)
  url.searchParams.set("q", query)
  url.searchParams.set("currency_code", currencyCode.toLowerCase())

  const optionalParams = {
    country_code: normalizeString(countryCode).toLowerCase(),
    locale: normalizeString(locale),
    region_id: normalizeString(regionId),
  }
  for (const [key, value] of Object.entries(optionalParams)) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }
  return url
}

export const fetchCatalogCandidates = async (input: CatalogCandidatesInput) => {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => {
    abortController.abort()
  }, CATALOG_FETCH_TIMEOUT_MS)
  const headers: Record<string, string> = { accept: "application/json" }
  if (MEDUSA_PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = MEDUSA_PUBLISHABLE_KEY
  }

  try {
    const response = await fetch(createCatalogAutocompleteUrl(input), {
      cache: "no-store",
      headers,
      signal: abortController.signal,
    })
    if (!response.ok) {
      throw new Error(`Catalog autocomplete failed: ${response.status}`)
    }
    const payload: unknown = await response.json()
    return parseCatalogAutocompleteResponse(payload)
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new Error(
        `Catalog autocomplete timed out after ${CATALOG_FETCH_TIMEOUT_MS}ms.`,
        { cause: error },
      )
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
