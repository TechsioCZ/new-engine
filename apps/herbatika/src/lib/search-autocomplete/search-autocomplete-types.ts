export type SearchAutocompleteSuggestionType =
  | "product"
  | "category"
  | "brand";

export type SearchAutocompleteSuggestion = {
  id: string;
  type: SearchAutocompleteSuggestionType;
  title: string;
  href: string;
  subtitle?: string;
  imageUrl?: string;
  priceLabel?: string;
  inStock?: boolean;
};

export type SearchAutocompleteResponse = {
  query: string;
  products: SearchAutocompleteSuggestion[];
  categories: SearchAutocompleteSuggestion[];
  brands: SearchAutocompleteSuggestion[];
};

export type SearchAutocompleteStatus = "idle" | "loading" | "success" | "error";

export type RawSearchAutocompleteFacetItem = {
  id?: unknown;
  label?: unknown;
  count?: unknown;
};

export type RawSearchAutocompleteCategoryRef = {
  id?: unknown;
  name?: unknown;
  handle?: unknown;
};

export type RawSearchAutocompleteProducerRef = {
  id?: unknown;
  title?: unknown;
  handle?: unknown;
};

export type RawSearchAutocompleteCalculatedPrice = {
  calculated_amount?: unknown;
  currency_code?: unknown;
};

export type RawSearchAutocompleteProductHit = {
  id?: unknown;
  title?: unknown;
  handle?: unknown;
  thumbnail?: unknown;
  metadata?: unknown;
  producer?: RawSearchAutocompleteProducerRef;
  categories?: RawSearchAutocompleteCategoryRef[];
  variants?: Array<{
    calculated_price?: RawSearchAutocompleteCalculatedPrice;
  }>;
};

export const SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH = 2;
export const SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH = 120;
export const SEARCH_AUTOCOMPLETE_DEBOUNCE_MS = 220;

export const createEmptySearchAutocompleteResponse = (
  query: string,
): SearchAutocompleteResponse => ({
  query,
  products: [],
  categories: [],
  brands: [],
});
