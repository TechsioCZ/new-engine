import { assertServerOnly } from "@/lib/server-guard"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import {
  getAppRequestServerContext,
  getMarketServerContext,
} from "@/lib/storefront/market-context.app"
import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
} from "@/lib/storefront/ssr/constants"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import { normalizeString } from "./search-autocomplete-normalizers"
import { createProductSuggestions } from "./search-autocomplete-product-normalizers"
import {
  createBrandSuggestions,
  createCategorySuggestions,
} from "./search-autocomplete-taxonomy-normalizers"
import {
  createEmptySearchAutocompleteResponse,
  type RawSearchAutocompleteFacetItem,
  type RawSearchAutocompleteProductHit,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  type SearchAutocompleteResponse,
} from "./search-autocomplete-types"

assertServerOnly("search-autocomplete/search-autocomplete.server")

type CatalogAutocompleteResponse = {
  facets?: {
    brand?: RawSearchAutocompleteFacetItem[]
  }
  products?: RawSearchAutocompleteProductHit[]
}

type FetchSearchAutocompleteInput = {
  query: string
}

const PRODUCT_LIMIT = 5
const CATEGORY_LIMIT = 5
const BRAND_LIMIT = 4
const CANDIDATE_LIMIT = 12
const CATALOG_FETCH_TIMEOUT_MS = 3000

const normalizeSearchAutocompleteQuery = (query: string) =>
  query.trim().slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)

const createCatalogAutocompleteUrl = ({
  countryCode,
  currencyCode,
  query,
  regionId,
  salesChannelId,
}: {
  countryCode: string
  currencyCode: string
  query: string
  regionId: string
  salesChannelId: string
}) => {
  const url = new URL("/store/catalog/products", MEDUSA_BACKEND_URL)
  url.searchParams.set("q", query)
  url.searchParams.set("page", "1")
  url.searchParams.set("limit", String(CANDIDATE_LIMIT))
  url.searchParams.set("sort", "recommended")
  url.searchParams.set("currency_code", currencyCode.toLowerCase())
  url.searchParams.set("sales_channel_id", salesChannelId)

  const normalizedRegionId = normalizeString(regionId)
  if (normalizedRegionId) {
    url.searchParams.set("region_id", normalizedRegionId)
  }

  const normalizedCountryCode = normalizeString(countryCode).toLowerCase()
  if (normalizedCountryCode) {
    url.searchParams.set("country_code", normalizedCountryCode)
  }

  return url
}

const fetchCatalogCandidates = async ({
  countryCode,
  currencyCode,
  query,
  regionId,
  salesChannelId,
}: {
  countryCode: string
  currencyCode: string
  query: string
  regionId: string
  salesChannelId: string
}) => {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => {
    abortController.abort()
  }, CATALOG_FETCH_TIMEOUT_MS)

  const headers: Record<string, string> = {
    accept: "application/json",
  }

  if (MEDUSA_PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = MEDUSA_PUBLISHABLE_KEY
  }

  try {
    const response = await fetch(
      createCatalogAutocompleteUrl({
        countryCode,
        currencyCode,
        query,
        regionId,
        salesChannelId,
      }),
      {
        cache: "no-store",
        headers,
        signal: abortController.signal,
      }
    )

    if (!response.ok) {
      throw new Error(`Catalog autocomplete failed: ${response.status}`)
    }

    return (await response.json()) as CatalogAutocompleteResponse
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
  query,
}: FetchSearchAutocompleteInput): Promise<SearchAutocompleteResponse> => {
  const normalizedQuery = normalizeSearchAutocompleteQuery(query)
  if (normalizedQuery.length < SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
    return createEmptySearchAutocompleteResponse(normalizedQuery)
  }

  const [requestContext, marketContext] = await Promise.all([
    getAppRequestServerContext(),
    getMarketServerContext(),
  ])
  const { region } = await getRegionServerContext(requestContext)
  if (!region?.region_id) {
    throw new Error("Search autocomplete requires an active storefront region")
  }
  const market = marketContext.code
  const safeCurrencyCode = resolveSupportedCurrencyCode(region.currency_code)
  const catalogResponse = await fetchCatalogCandidates({
    countryCode: marketContext.countryCode,
    currencyCode: safeCurrencyCode,
    query: normalizedQuery,
    regionId: region.region_id,
    salesChannelId: marketContext.salesChannelId,
  })
  const productHits = catalogResponse.products ?? []

  return {
    query: normalizedQuery,
    products: createProductSuggestions(
      productHits,
      safeCurrencyCode,
      PRODUCT_LIMIT,
      market
    ),
    categories: createCategorySuggestions({
      productHits,
      query: normalizedQuery,
      limit: CATEGORY_LIMIT,
      market,
    }),
    brands: createBrandSuggestions({
      brandFacets: catalogResponse.facets?.brand ?? [],
      productHits,
      query: normalizedQuery,
      limit: BRAND_LIMIT,
      market,
    }),
  }
}
