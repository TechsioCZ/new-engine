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

export type RawSearchAutocompleteCategoryRef = {
  id?: unknown;
  name?: unknown;
  handle?: unknown;
};

export type RawSearchAutocompleteProductHit = {
  id?: unknown;
  title?: unknown;
  handle?: unknown;
  thumbnail?: unknown;
  producer?: {
    title?: unknown;
  };
  categories?: RawSearchAutocompleteCategoryRef[];
  facet_price?: unknown;
  facet_in_stock?: unknown;
};

export type RawSearchAutocompleteCategoryHit = {
  id?: unknown;
  title?: unknown;
  name?: unknown;
  handle?: unknown;
};

export type RawSearchAutocompleteProducerHit = {
  id?: unknown;
  title?: unknown;
  handle?: unknown;
};

export const SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH = 2;
export const SEARCH_AUTOCOMPLETE_DEBOUNCE_MS = 220;

export const createEmptySearchAutocompleteResponse = (
  query: string,
): SearchAutocompleteResponse => ({
  query,
  products: [],
  categories: [],
  brands: [],
});
