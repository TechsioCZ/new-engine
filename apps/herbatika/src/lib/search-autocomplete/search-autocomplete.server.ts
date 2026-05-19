import "server-only";

import {
  createEmptySearchAutocompleteResponse,
  type RawSearchAutocompleteCategoryHit,
  type RawSearchAutocompleteProducerHit,
  type RawSearchAutocompleteProductHit,
  SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  type SearchAutocompleteResponse,
} from "./search-autocomplete-types";
import {
  createBrandSuggestions,
  createCategorySuggestions,
  createProductSuggestions,
  normalizeCurrencyCode,
  normalizeString,
} from "./search-autocomplete-normalizers";

type MeiliResult<THit> = {
  hits?: THit[];
};

type MeiliMultiSearchResponse = {
  results?: [
    MeiliResult<RawSearchAutocompleteProductHit>,
    MeiliResult<RawSearchAutocompleteCategoryHit>,
    MeiliResult<RawSearchAutocompleteProductHit>,
    MeiliResult<RawSearchAutocompleteProducerHit>,
  ];
};

type MeiliConfig = {
  host: string;
  apiKey: string;
  productsIndex: string;
  categoriesIndex: string;
  producersIndex: string;
};

const PRODUCT_LIMIT = 5;
const CATEGORY_LIMIT = 5;
const BRAND_LIMIT = 4;

const resolveMeiliConfig = (): MeiliConfig | null => {
  const host = normalizeString(process.env.MEILISEARCH_HOST).replace(/\/+$/, "");
  const apiKey = normalizeString(process.env.MEILISEARCH_SEARCH_API_KEY);
  const productsIndex =
    normalizeString(process.env.MEILISEARCH_PRODUCTS_INDEX) || "products";
  const categoriesIndex =
    normalizeString(process.env.MEILISEARCH_CATEGORIES_INDEX) || "categories";
  const producersIndex =
    normalizeString(process.env.MEILISEARCH_PRODUCERS_INDEX) || "producers";

  if (!host || !apiKey) {
    return null;
  }

  return { host, apiKey, productsIndex, categoriesIndex, producersIndex };
};

const createMeiliBody = (query: string, config: MeiliConfig) => ({
  queries: [
    {
      indexUid: config.productsIndex,
      q: query,
      limit: PRODUCT_LIMIT,
      filter: "facet_product_status = published",
      attributesToRetrieve: [
        "id",
        "title",
        "handle",
        "thumbnail",
        "producer",
        "categories",
        "facet_price",
        "facet_in_stock",
      ],
    },
    {
      indexUid: config.categoriesIndex,
      q: query,
      limit: CATEGORY_LIMIT,
      attributesToRetrieve: ["id", "name", "title", "handle"],
    },
    {
      indexUid: config.productsIndex,
      q: query,
      limit: 10,
      filter: "facet_product_status = published",
      attributesToSearchOn: ["categories.name"],
      attributesToRetrieve: ["id", "categories"],
    },
    {
      indexUid: config.producersIndex,
      q: query,
      limit: BRAND_LIMIT,
      attributesToRetrieve: ["id", "title", "handle"],
    },
  ],
});

export const fetchSearchAutocomplete = async ({
  query,
  currencyCode,
}: {
  query: string;
  currencyCode?: string | null;
}): Promise<SearchAutocompleteResponse> => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < SEARCH_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
    return createEmptySearchAutocompleteResponse(normalizedQuery);
  }

  const config = resolveMeiliConfig();
  if (!config) {
    throw new Error("Meilisearch autocomplete is not configured.");
  }

  const response = await fetch(`${config.host}/multi-search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createMeiliBody(normalizedQuery, config)),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Meilisearch autocomplete failed: ${response.status}`);
  }

  const data = (await response.json()) as MeiliMultiSearchResponse;
  const [
    productResults,
    categoryResults,
    categoryProductResults,
    producerResults,
  ] = data.results ?? [];
  const safeCurrencyCode = normalizeCurrencyCode(currencyCode);

  return {
    query: normalizedQuery,
    products: createProductSuggestions(
      productResults?.hits ?? [],
      safeCurrencyCode,
    ),
    categories: createCategorySuggestions({
      categoryHits: categoryResults?.hits ?? [],
      productHits: categoryProductResults?.hits ?? [],
      query: normalizedQuery,
      limit: CATEGORY_LIMIT,
    }),
    brands: createBrandSuggestions(producerResults?.hits ?? []),
  };
};
