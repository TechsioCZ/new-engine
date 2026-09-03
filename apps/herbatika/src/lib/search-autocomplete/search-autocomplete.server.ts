import "server-only"

import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { getMarketStorefrontSdk } from "@/lib/storefront/market-sdk.server"
import {
  type PublicEntitySlugMap,
  readRequiredPublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"
import type { Market } from "@/lib/url/types"
import type { EntityUrlKind } from "@/lib/url-registry/model"
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
  authToken?: string | null
  market: Market
  query: string
  countryCode?: string | null
  currencyCode?: string | null
  locale?: string | null
  regionId?: string | null
}

const CATALOG_FETCH_TIMEOUT_MS = 3000

const requirePublicSlugMap = async (
  market: Market,
  kind: EntityUrlKind,
  requiredSourceIds: readonly string[]
): Promise<PublicEntitySlugMap> => {
  const result = await readRequiredPublicEntitySlugs({
    kind,
    market,
    requiredSourceIds,
  })
  if (result.kind === "found") {
    return result.value
  }

  const cause =
    result.kind === "invalid-response" ? ` (${result.causeCode})` : ""
  throw new Error(`Public URL projections unavailable for ${kind}${cause}`)
}

// Content search documents use "<type>_<sourceId>" ids; the URL registry
// stores the bare source id.
const contentSourceId = (type: "article" | "page", id: unknown) => {
  const normalized = normalizeString(id)
  const prefix = `${type}_`
  return normalized.startsWith(prefix)
    ? normalized.slice(prefix.length)
    : normalized
}

const normalizeSearchAutocompleteQuery = (query: string) =>
  query.trim().slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)

const uniqueCandidateIds = (values: readonly unknown[]) => [
  ...new Set(values.map(normalizeString).filter(Boolean)),
]

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
  authToken,
  countryCode,
  currencyCode,
  locale,
  market,
  query,
  regionId,
}: {
  authToken?: string | null
  countryCode?: string | null
  currencyCode: string
  locale?: string | null
  market: Market
  query: string
  regionId?: string | null
}) => {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => {
    abortController.abort()
  }, CATALOG_FETCH_TIMEOUT_MS)

  try {
    return await getMarketStorefrontSdk(
      market
    ).sdk.client.fetch<CatalogAutocompleteResponse>(
      "/store/search/autocomplete",
      {
        headers: authToken
          ? { authorization: `Bearer ${authToken}` }
          : undefined,
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
  authToken,
  countryCode,
  currencyCode,
  locale,
  market,
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
    authToken,
    countryCode,
    currencyCode: safeCurrencyCode,
    locale,
    market,
    query: normalizedQuery,
    regionId,
  })
  const productHits = catalogResponse.products ?? []
  const contentHits = catalogResponse.content ?? []
  const [
    publicSlugsByProductId,
    publicSlugsByCategoryId,
    publicSlugsByBrandId,
    publicSlugsByArticleId,
    publicSlugsByPageId,
  ] = await Promise.all([
    requirePublicSlugMap(
      market,
      "product",
      uniqueCandidateIds(productHits.map(({ id }) => id))
    ),
    requirePublicSlugMap(
      market,
      "category",
      uniqueCandidateIds((catalogResponse.categories ?? []).map(({ id }) => id))
    ),
    requirePublicSlugMap(
      market,
      "brand",
      uniqueCandidateIds((catalogResponse.brands ?? []).map(({ id }) => id))
    ),
    requirePublicSlugMap(
      market,
      "article",
      uniqueCandidateIds(
        contentHits
          .filter(({ type }) => normalizeString(type) === "article")
          .map(({ id }) => contentSourceId("article", id))
      )
    ),
    requirePublicSlugMap(
      market,
      "page",
      uniqueCandidateIds(
        contentHits
          .filter(({ type }) => normalizeString(type) === "page")
          .map(({ id }) => contentSourceId("page", id))
      )
    ),
  ])

  return {
    query: normalizedQuery,
    products: createProductSuggestions({
      currencyCode: safeCurrencyCode,
      hits: productHits,
      market,
      publicSlugsByProductId,
    }),
    categories: createCategorySuggestions({
      categoryHits: catalogResponse.categories ?? [],
      market,
      publicSlugsByCategoryId,
    }),
    brands: createBrandSuggestions({
      brandHits: catalogResponse.brands ?? [],
      market,
      publicSlugsByBrandId,
    }),
    content: createContentSuggestions(
      catalogResponse.content ?? [],
      market,
      publicSlugsByArticleId,
      publicSlugsByPageId
    ),
  }
}
