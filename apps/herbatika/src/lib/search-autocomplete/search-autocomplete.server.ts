import "server-only"
import { isRecord } from "@techsio/std/object"

import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
} from "@/lib/storefront/ssr/constants"

import { createContentSuggestions } from "./search-autocomplete-content-normalizers"
import { normalizeString } from "./search-autocomplete-normalizers"
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
import type {
  RawSearchAutocompleteBrandRef,
  RawSearchAutocompleteCategoryRef,
  RawSearchAutocompleteContentHit,
  RawSearchAutocompleteProductHit,
  SearchAutocompleteResponse,
} from "./search-autocomplete-types"

interface CatalogAutocompleteResponse {
  brands: RawSearchAutocompleteBrandRef[]
  categories: RawSearchAutocompleteCategoryRef[]
  content: RawSearchAutocompleteContentHit[]
  degraded: boolean
  products: RawSearchAutocompleteProductHit[]
}

interface FetchSearchAutocompleteInput {
  query: string
  countryCode?: string | null
  currencyCode?: string | null
  locale?: string | null
  regionId?: string | null
}

const CATALOG_FETCH_TIMEOUT_MS = 3000

class InvalidCatalogAutocompleteResponseError extends Error {
  readonly code = "INVALID_CATALOG_AUTOCOMPLETE_RESPONSE"

  constructor(field: string) {
    super(`Catalog autocomplete returned an invalid ${field}`)
    this.name = "InvalidCatalogAutocompleteResponseError"
  }
}

const isOptionalNullableRecord = (value: unknown): boolean =>
  value === undefined || value === null || isRecord(value)

const isOptionalNullableString = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "string"

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const hasValidStringFields = (
  value: Record<string, unknown>,
  fields: readonly string[],
): boolean => fields.every((field) => isOptionalNullableString(value[field]))

const hasRequiredStringFields = (
  value: Record<string, unknown>,
  fields: readonly string[],
): boolean => fields.every((field) => isNonEmptyString(value[field]))

const isOptionalNullableFiniteNumber = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  return typeof value === "number" && Number.isFinite(value)
}

const isRawCalculatedPrice = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  if (!isRecord(value)) {
    return false
  }

  const { calculated_amount: amount, currency_code: currencyCode } = value
  return (
    isOptionalNullableFiniteNumber(amount) &&
    isOptionalNullableString(currencyCode)
  )
}

const isRawVariant = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  isNonEmptyString(value["id"]) &&
  hasValidStringFields(value, ["barcode", "ean", "sku", "title", "upc"]) &&
  isRawCalculatedPrice(value["calculated_price"])

const isRawBrandRef = (
  value: unknown,
): value is RawSearchAutocompleteBrandRef =>
  isRecord(value) && hasRequiredStringFields(value, ["handle", "id", "title"])

const isRawCategoryRef = (
  value: unknown,
): value is RawSearchAutocompleteCategoryRef =>
  isRecord(value) && hasRequiredStringFields(value, ["handle", "id", "name"])

const isSafeLocalHref = (value: unknown): value is string => {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return false
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined || codePoint < 32) {
      return false
    }
  }
  return true
}

const isRawContentHit = (
  value: unknown,
): value is RawSearchAutocompleteContentHit =>
  isRecord(value) &&
  hasRequiredStringFields(value, ["href", "id", "title"]) &&
  isSafeLocalHref(value["href"]) &&
  hasValidStringFields(value, ["excerpt", "type"])

const isRawProductHit = (
  value: unknown,
): value is RawSearchAutocompleteProductHit => {
  if (!isRecord(value)) {
    return false
  }
  const {
    brand,
    categories,
    metadata,
    search_result: searchResult,
    variants,
  } = value
  if (
    !hasRequiredStringFields(value, ["handle", "id", "title"]) ||
    !isOptionalNullableString(value["thumbnail"]) ||
    !isOptionalNullableRecord(metadata)
  ) {
    return false
  }
  if (brand !== undefined && brand !== null && !isRawBrandRef(brand)) {
    return false
  }
  if (
    categories !== undefined &&
    categories !== null &&
    (!Array.isArray(categories) || !categories.every(isRawCategoryRef))
  ) {
    return false
  }
  if (
    searchResult !== undefined &&
    (!isRecord(searchResult) ||
      !hasValidStringFields(searchResult, ["variant_id", "variant_title"]))
  ) {
    return false
  }
  return (
    variants === undefined ||
    variants === null ||
    (Array.isArray(variants) && variants.every(isRawVariant))
  )
}

const parseArray = <T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
  field: string,
): T[] => {
  if (!Array.isArray(value) || !value.every(predicate)) {
    throw new InvalidCatalogAutocompleteResponseError(field)
  }
  return value
}

const parseCatalogAutocompleteResponse = (
  value: unknown,
): CatalogAutocompleteResponse => {
  if (!isRecord(value)) {
    throw new InvalidCatalogAutocompleteResponseError("response body")
  }
  if (typeof value["degraded"] !== "boolean") {
    throw new InvalidCatalogAutocompleteResponseError("degraded flag")
  }

  return {
    brands: parseArray(value["brands"], isRawBrandRef, "brands"),
    categories: parseArray(value["categories"], isRawCategoryRef, "categories"),
    content: parseArray(value["content"], isRawContentHit, "content"),
    degraded: value["degraded"],
    products: parseArray(value["products"], isRawProductHit, "products"),
  }
}

const normalizeSearchAutocompleteQuery = (query: string) =>
  query.trim().slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)

const createCatalogAutocompleteUrl = ({
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
  const url = new URL("/store/search/autocomplete", MEDUSA_BACKEND_URL)
  url.searchParams.set("q", query)
  url.searchParams.set("currency_code", currencyCode.toLowerCase())

  const normalizedLocale = normalizeString(locale)
  if (normalizedLocale) {
    url.searchParams.set("locale", normalizedLocale)
  }

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

  const headers: Record<string, string> = {
    accept: "application/json",
  }

  if (MEDUSA_PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = MEDUSA_PUBLISHABLE_KEY
  }

  try {
    const response = await fetch(
      createCatalogAutocompleteUrl({
        ...(countryCode === undefined ? {} : { countryCode }),
        currencyCode,
        ...(locale === undefined ? {} : { locale }),
        query,
        ...(regionId === undefined ? {} : { regionId }),
      }),
      {
        cache: "no-store",
        headers,
        signal: abortController.signal,
      },
    )

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
    ...(countryCode === undefined ? {} : { countryCode }),
    currencyCode: safeCurrencyCode,
    ...(locale === undefined ? {} : { locale }),
    query: normalizedQuery,
    ...(regionId === undefined ? {} : { regionId }),
  })
  const productHits = catalogResponse.products ?? []

  return {
    brands: createBrandSuggestions({
      brandHits: catalogResponse.brands,
    }),
    categories: createCategorySuggestions({
      categoryHits: catalogResponse.categories,
    }),
    content: createContentSuggestions(catalogResponse.content),
    degraded: catalogResponse.degraded,
    products: createProductSuggestions(productHits, safeCurrencyCode),
    query: normalizedQuery,
  }
}
