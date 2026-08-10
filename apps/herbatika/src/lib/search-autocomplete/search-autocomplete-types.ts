import { getRecordValue, isRecord } from "@techsio/std/object"

export type SearchAutocompleteSuggestionType =
  | "product"
  | "category"
  | "brand"
  | "content"

export interface SearchAutocompleteSuggestion {
  id: string
  type: SearchAutocompleteSuggestionType
  title: string
  href: string
  subtitle?: string
  imageUrl?: string | undefined
  priceLabel?: string | undefined
  inStock?: boolean
}

export interface SearchAutocompleteResponse {
  brands: SearchAutocompleteSuggestion[]
  categories: SearchAutocompleteSuggestion[]
  content: SearchAutocompleteSuggestion[]
  degraded: boolean
  products: SearchAutocompleteSuggestion[]
  query: string
}

const isOptionalString = (value: unknown) =>
  value === undefined || typeof value === "string"

const isSearchAutocompleteSuggestion = (
  value: unknown,
  expectedType: SearchAutocompleteSuggestionType,
): value is SearchAutocompleteSuggestion => {
  if (!isRecord(value)) {
    return false
  }
  const href = getRecordValue(value, "href")
  const id = getRecordValue(value, "id")
  const imageUrl = getRecordValue(value, "imageUrl")
  const inStock = getRecordValue(value, "inStock")
  const priceLabel = getRecordValue(value, "priceLabel")
  const subtitle = getRecordValue(value, "subtitle")
  const title = getRecordValue(value, "title")
  const type = getRecordValue(value, "type")
  if (type !== expectedType) {
    return false
  }
  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof href !== "string"
  ) {
    return false
  }
  if (
    (Object.hasOwn(value, "subtitle") && typeof subtitle !== "string") ||
    !isOptionalString(imageUrl) ||
    !isOptionalString(priceLabel)
  ) {
    return false
  }

  return !Object.hasOwn(value, "inStock") || typeof inStock === "boolean"
}

const isSuggestionArray = (
  value: unknown,
  expectedType: SearchAutocompleteSuggestionType,
): value is SearchAutocompleteSuggestion[] =>
  Array.isArray(value) &&
  value.every((suggestion) =>
    isSearchAutocompleteSuggestion(suggestion, expectedType),
  )

const isSearchAutocompleteResponse = (
  value: unknown,
): value is SearchAutocompleteResponse => {
  if (!isRecord(value)) {
    return false
  }
  const brands = getRecordValue(value, "brands")
  const categories = getRecordValue(value, "categories")
  const content = getRecordValue(value, "content")
  const degraded = getRecordValue(value, "degraded")
  const products = getRecordValue(value, "products")
  const query = getRecordValue(value, "query")
  if (typeof query !== "string" || typeof degraded !== "boolean") {
    return false
  }
  if (!isSuggestionArray(products, "product")) {
    return false
  }
  if (!isSuggestionArray(categories, "category")) {
    return false
  }

  return (
    isSuggestionArray(brands, "brand") && isSuggestionArray(content, "content")
  )
}

class InvalidSearchAutocompleteResponseError extends Error {
  readonly code = "INVALID_SEARCH_AUTOCOMPLETE_RESPONSE"

  constructor() {
    super("Search autocomplete response did not match the expected schema")
    this.name = "InvalidSearchAutocompleteResponseError"
  }
}

export const parseSearchAutocompleteResponse = (
  value: unknown,
): SearchAutocompleteResponse => {
  if (!isSearchAutocompleteResponse(value)) {
    throw new InvalidSearchAutocompleteResponseError()
  }

  return value
}

export type SearchAutocompleteStatus = "idle" | "loading" | "success" | "error"

export interface RawSearchAutocompleteCategoryRef {
  handle: string
  id: string
  name: string
}

export interface RawSearchAutocompleteBrandRef {
  handle: string
  id: string
  title: string
}

export interface RawSearchAutocompleteContentHit {
  excerpt?: string | null
  href: string
  id: string
  title: string
  type?: string | null
}

interface RawSearchAutocompleteCalculatedPrice {
  calculated_amount?: number | null
  currency_code?: string | null
}

interface RawSearchAutocompleteResult {
  variant_id?: string | null
  variant_title?: string | null
}

interface RawSearchAutocompleteVariant {
  barcode?: string | null
  calculated_price?: RawSearchAutocompleteCalculatedPrice | null
  ean?: string | null
  id: string
  sku?: string | null
  title?: string | null
  upc?: string | null
}

export interface RawSearchAutocompleteProductHit {
  brand?: RawSearchAutocompleteBrandRef | null
  categories?: RawSearchAutocompleteCategoryRef[] | null
  handle: string
  id: string
  metadata?: object | null
  search_result?: RawSearchAutocompleteResult
  thumbnail?: string | null
  title: string
  variants?: RawSearchAutocompleteVariant[] | null
}

export const SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH = 2
export const SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH = 120
export const SEARCH_AUTOCOMPLETE_DEBOUNCE_MS = 220

export const createEmptySearchAutocompleteResponse = (
  query: string,
): SearchAutocompleteResponse => ({
  brands: [],
  categories: [],
  content: [],
  degraded: false,
  products: [],
  query,
})
