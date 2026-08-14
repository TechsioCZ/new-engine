import "server-only"

import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { storefrontSdk } from "@/lib/storefront/sdk"
import { createContentSuggestions } from "./search-autocomplete-content-normalizers"
import { normalizeString } from "./search-autocomplete-normalizers"
import { createProductSuggestions } from "./search-autocomplete-product-normalizers"
import {
  createBrandSuggestions,
  createCategorySuggestions,
} from "./search-autocomplete-taxonomy-normalizers"
import {
  createEmptySearchAutocompleteResponse,
  type RawSearchAutocompleteBrandRef,
  type RawSearchAutocompleteCategoryRef,
  type RawSearchAutocompleteContentHit,
  type RawSearchAutocompleteProductHit,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  type SearchAutocompleteResponse,
} from "./search-autocomplete-types"

type CatalogAutocompleteResponse = {
  brands?: RawSearchAutocompleteBrandRef[]
  categories?: RawSearchAutocompleteCategoryRef[]
  content?: RawSearchAutocompleteContentHit[]
  products?: RawSearchAutocompleteProductHit[]
}

type FetchSearchAutocompleteInput = {
  query: string
  countryCode?: string | null
  currencyCode?: string | null
  locale?: string | null
  regionId?: string | null
}

const CATALOG_FETCH_TIMEOUT_MS = 3000

const normalizeSearchAutocompleteQuery = (query: string) =>
  query.trim().slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)

const createCatalogAutocompleteQuery = ({
  countryCode,
  currencyCode,
  locale,
  query,
  regionId,
}: {
  countryCode?: string | null
  currencyCode: string
  locale?: string | null
  query: string
  regionId?: string | null
}) => {
  const requestQuery: Record<string, string> = {
    q: query,
    currency_code: currencyCode.toLowerCase(),
  }

  const normalizedRegionId = normalizeString(regionId)
  if (normalizedRegionId) {
    requestQuery.region_id = normalizedRegionId
  }

  const normalizedCountryCode = normalizeString(countryCode).toLowerCase()
  if (normalizedCountryCode) {
    requestQuery.country_code = normalizedCountryCode
  }

  const normalizedLocale = normalizeString(locale)
  if (normalizedLocale) {
    requestQuery.locale = normalizedLocale
  }

  return requestQuery
}

const fetchCatalogCandidates = async ({
  countryCode,
  currencyCode,
  locale,
  query,
  regionId,
}: {
  countryCode?: string | null
  currencyCode: string
  locale?: string | null
  query: string
  regionId?: string | null
}) => {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => {
    abortController.abort()
  }, CATALOG_FETCH_TIMEOUT_MS)

  try {
    return await storefrontSdk.client.fetch<CatalogAutocompleteResponse>(
      "/store/search/autocomplete",
      {
        query: createCatalogAutocompleteQuery({
          countryCode,
          currencyCode,
          locale,
          query,
          regionId,
        }),
        signal: abortController.signal,
      }
    )
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new Error(
        `Catalog autocomplete timed out after ${CATALOG_FETCH_TIMEOUT_MS}ms.`
      )
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const fetchSearchAutocomplete = async ({
  countryCode,
  currencyCode,
  locale,
  query,
  regionId,
}: FetchSearchAutocompleteInput): Promise<SearchAutocompleteResponse> => {
  const normalizedQuery = normalizeSearchAutocompleteQuery(query)
  if (
    normalizedQuery.length > 0 &&
    normalizedQuery.length < SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH
  ) {
    return createEmptySearchAutocompleteResponse(normalizedQuery)
  }

  const safeCurrencyCode = resolveSupportedCurrencyCode(currencyCode)
  const catalogResponse = await fetchCatalogCandidates({
    countryCode,
    currencyCode: safeCurrencyCode,
    locale,
    query: normalizedQuery,
    regionId,
  })
  const productHits = catalogResponse.products ?? []

  return {
    query: normalizedQuery,
    products: createProductSuggestions(productHits, safeCurrencyCode),
    categories: createCategorySuggestions({
      categoryHits: catalogResponse.categories ?? [],
    }),
    brands: createBrandSuggestions({
      brandHits: catalogResponse.brands ?? [],
    }),
    content: createContentSuggestions(catalogResponse.content ?? []),
  }
}
