import { isRecord } from "@techsio/std/object"

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
  const { href, id, imageUrl, inStock, priceLabel, subtitle, title, type } =
    value
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
    !isOptionalString(subtitle) ||
    !isOptionalString(imageUrl) ||
    !isOptionalString(priceLabel)
  ) {
    return false
  }

  return inStock === undefined || typeof inStock === "boolean"
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
  const { brands, categories, content, degraded, products, query } = value
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
  id?: unknown
  name?: unknown
  handle?: unknown
}

export interface RawSearchAutocompleteBrandRef {
  id?: unknown
  title?: unknown
  handle?: unknown
}

export interface RawSearchAutocompleteContentHit {
  excerpt?: unknown
  href?: unknown
  id?: unknown
  title?: unknown
  type?: unknown
}

interface RawSearchAutocompleteCalculatedPrice {
  calculated_amount?: unknown
  currency_code?: unknown
}

export interface RawSearchAutocompleteProductHit {
  brand?: RawSearchAutocompleteBrandRef | null
  categories?: RawSearchAutocompleteCategoryRef[] | null
  handle?: unknown
  id?: unknown
  metadata?: unknown
  search_result?: {
    variant_id?: unknown
    variant_title?: unknown
  }
  thumbnail?: unknown
  title?: unknown
  variants?:
    | {
        barcode?: unknown
        calculated_price?: RawSearchAutocompleteCalculatedPrice | null
        ean?: unknown
        id?: unknown
        sku?: unknown
        title?: unknown
        upc?: unknown
      }[]
    | null
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
