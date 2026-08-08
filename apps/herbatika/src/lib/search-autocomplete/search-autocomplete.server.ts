import "server-only"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"

import { fetchCatalogCandidates } from "./search-autocomplete-catalog.server"
import { createContentSuggestions } from "./search-autocomplete-content-normalizers"
import { createProductSuggestions } from "./search-autocomplete-product-normalizers"
import {
  createBrandSuggestions,
  createCategorySuggestions,
} from "./search-autocomplete-taxonomy-normalizers"
import {
  createEmptySearchAutocompleteResponse,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
} from "./search-autocomplete-types"
import type { SearchAutocompleteResponse } from "./search-autocomplete-types"

interface FetchSearchAutocompleteInput {
  query: string
  countryCode?: string | null
  currencyCode?: string | null
  locale?: string | null
  regionId?: string | null
}

export const fetchSearchAutocomplete = async ({
  countryCode,
  currencyCode,
  locale,
  query,
  regionId,
}: FetchSearchAutocompleteInput): Promise<SearchAutocompleteResponse> => {
  const normalizedQuery = query
    .trim()
    .slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)
  if (
    normalizedQuery.length > 0 &&
    normalizedQuery.length < SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH
  ) {
    return createEmptySearchAutocompleteResponse(normalizedQuery)
  }

  const safeCurrencyCode = resolveSupportedCurrencyCode(currencyCode)
  const catalog = await fetchCatalogCandidates({
    ...(countryCode === undefined ? {} : { countryCode }),
    currencyCode: safeCurrencyCode,
    ...(locale === undefined ? {} : { locale }),
    query: normalizedQuery,
    ...(regionId === undefined ? {} : { regionId }),
  })

  return {
    brands: createBrandSuggestions({ brandHits: catalog.brands }),
    categories: createCategorySuggestions({ categoryHits: catalog.categories }),
    content: createContentSuggestions(catalog.content),
    degraded: catalog.degraded,
    products: createProductSuggestions(catalog.products, safeCurrencyCode),
    query: normalizedQuery,
  }
}
