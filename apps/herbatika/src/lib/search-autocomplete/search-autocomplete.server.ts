import "server-only";

import {
  getMedusaPublishableHeaders,
  MEDUSA_BACKEND_URL,
} from "@/lib/storefront/ssr/constants";
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency";
import {
  createEmptySearchAutocompleteResponse,
  type RawSearchAutocompleteFacetItem,
  type RawSearchAutocompleteProductHit,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  type SearchAutocompleteResponse,
} from "./search-autocomplete-types";
import { createProductSuggestions } from "./search-autocomplete-product-normalizers";
import { normalizeString } from "./search-autocomplete-normalizers";
import {
  createBrandSuggestions,
  createCategorySuggestions,
} from "./search-autocomplete-taxonomy-normalizers";

type CatalogAutocompleteResponse = {
  facets?: {
    brand?: RawSearchAutocompleteFacetItem[];
  };
  products?: RawSearchAutocompleteProductHit[];
};

type FetchSearchAutocompleteInput = {
  query: string;
  countryCode?: string | null;
  currencyCode?: string | null;
  regionId?: string | null;
};

const PRODUCT_LIMIT = 5;
const CATEGORY_LIMIT = 5;
const BRAND_LIMIT = 4;
const CANDIDATE_LIMIT = 12;
const CATALOG_FETCH_TIMEOUT_MS = 3000;

const normalizeSearchAutocompleteQuery = (query: string) =>
  query.trim().slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH);

const createCatalogAutocompleteUrl = ({
  countryCode,
  currencyCode,
  query,
  regionId,
}: {
  countryCode?: string | null;
  currencyCode: string;
  query: string;
  regionId?: string | null;
}) => {
  const url = new URL("/store/catalog/products", MEDUSA_BACKEND_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", String(CANDIDATE_LIMIT));
  url.searchParams.set("sort", "recommended");
  url.searchParams.set("currency_code", currencyCode.toLowerCase());

  const normalizedRegionId = normalizeString(regionId);
  if (normalizedRegionId) {
    url.searchParams.set("region_id", normalizedRegionId);
  }

  const normalizedCountryCode = normalizeString(countryCode).toLowerCase();
  if (normalizedCountryCode) {
    url.searchParams.set("country_code", normalizedCountryCode);
  }

  return url;
};

const fetchCatalogCandidates = async ({
  countryCode,
  currencyCode,
  query,
  regionId,
}: {
  countryCode?: string | null;
  currencyCode: string;
  query: string;
  regionId?: string | null;
}) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, CATALOG_FETCH_TIMEOUT_MS);

  const headers: Record<string, string> = {
    accept: "application/json",
    ...getMedusaPublishableHeaders(),
  };

  try {
    const response = await fetch(
      createCatalogAutocompleteUrl({
        countryCode,
        currencyCode,
        query,
        regionId,
      }),
      {
        cache: "no-store",
        headers,
        signal: abortController.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Catalog autocomplete failed: ${response.status}`);
    }

    return (await response.json()) as CatalogAutocompleteResponse;
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new Error(
        `Catalog autocomplete timed out after ${CATALOG_FETCH_TIMEOUT_MS}ms.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchSearchAutocomplete = async ({
  countryCode,
  currencyCode,
  query,
  regionId,
}: FetchSearchAutocompleteInput): Promise<SearchAutocompleteResponse> => {
  const normalizedQuery = normalizeSearchAutocompleteQuery(query);
  if (normalizedQuery.length < SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
    return createEmptySearchAutocompleteResponse(normalizedQuery);
  }

  const safeCurrencyCode = resolveSupportedCurrencyCode(currencyCode);
  const catalogResponse = await fetchCatalogCandidates({
    countryCode,
    currencyCode: safeCurrencyCode,
    query: normalizedQuery,
    regionId,
  });
  const productHits = catalogResponse.products ?? [];

  return {
    query: normalizedQuery,
    products: createProductSuggestions(
      productHits,
      safeCurrencyCode,
      PRODUCT_LIMIT,
    ),
    categories: createCategorySuggestions({
      productHits,
      query: normalizedQuery,
      limit: CATEGORY_LIMIT,
    }),
    brands: createBrandSuggestions({
      brandFacets: catalogResponse.facets?.brand ?? [],
      productHits,
      query: normalizedQuery,
      limit: BRAND_LIMIT,
    }),
  };
};
