export type SearchAutocompleteSuggestionType = "product" | "category" | "brand"

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
  query: string
  products: SearchAutocompleteSuggestion[]
  categories: SearchAutocompleteSuggestion[]
  brands: SearchAutocompleteSuggestion[]
}

export type SearchAutocompleteStatus = "idle" | "loading" | "success" | "error"

export interface RawSearchAutocompleteFacetItem {
  id?: unknown
  label?: unknown
  count?: unknown
}

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

interface RawSearchAutocompleteCalculatedPrice {
  calculated_amount?: unknown
  currency_code?: unknown
}

export interface RawSearchAutocompleteProductHit {
  id?: unknown
  title?: unknown
  handle?: unknown
  thumbnail?: unknown
  metadata?: unknown
  brand?: RawSearchAutocompleteBrandRef
  categories?: RawSearchAutocompleteCategoryRef[]
  variants?: {
    calculated_price?: RawSearchAutocompleteCalculatedPrice
  }[]
}

export const SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH = 2
export const SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH = 120
export const SEARCH_AUTOCOMPLETE_DEBOUNCE_MS = 220

export const createEmptySearchAutocompleteResponse = (
  query: string,
): SearchAutocompleteResponse => ({
  brands: [],
  categories: [],
  products: [],
  query,
})
