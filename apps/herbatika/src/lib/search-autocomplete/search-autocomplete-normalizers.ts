import { createBrandHref, createBrandSlug } from "@/lib/storefront/brands";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import type {
  RawSearchAutocompleteCategoryHit,
  RawSearchAutocompleteCategoryRef,
  RawSearchAutocompleteProducerHit,
  RawSearchAutocompleteProductHit,
  SearchAutocompleteSuggestion,
} from "./search-autocomplete-types";

export type CurrencyCode = "EUR" | "CZK";

const DEFAULT_CURRENCY_CODE: CurrencyCode = "EUR";

export const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const normalizeCurrencyCode = (value?: string | null): CurrencyCode =>
  value?.toUpperCase() === "CZK" ? "CZK" : DEFAULT_CURRENCY_CODE;

const normalizeComparable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("sk");

const createHandleLabel = (handle: string) => {
  const label = handle.replaceAll(/[-_]+/g, " ").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Kategória";
};

const createProductSuggestion = (
  hit: RawSearchAutocompleteProductHit,
  currencyCode: CurrencyCode,
): SearchAutocompleteSuggestion | null => {
  const id = normalizeString(hit.id);
  const title = normalizeString(hit.title);
  const handle = normalizeString(hit.handle);

  if (!id || !title || !handle) {
    return null;
  }

  const producerTitle = normalizeString(hit.producer?.title);
  const firstCategory = hit.categories?.find((category) =>
    Boolean(normalizeString(category.name)),
  );
  const categoryName = normalizeString(firstCategory?.name);
  const price = typeof hit.facet_price === "number" ? hit.facet_price : null;

  return {
    id,
    type: "product",
    title,
    href: `/p/${handle}`,
    subtitle: [producerTitle, categoryName].filter(Boolean).join(" | "),
    imageUrl: normalizeString(hit.thumbnail) || undefined,
    priceLabel:
      price === null ? undefined : formatCurrencyAmount(price, currencyCode),
    inStock:
      typeof hit.facet_in_stock === "boolean" ? hit.facet_in_stock : undefined,
  };
};

export const createProductSuggestions = (
  hits: RawSearchAutocompleteProductHit[],
  currencyCode: CurrencyCode,
) =>
  hits
    .map((hit) => createProductSuggestion(hit, currencyCode))
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item));

const categoryMatchesQuery = (
  category: RawSearchAutocompleteCategoryRef,
  query: string,
) => {
  const comparableQuery = normalizeComparable(query);
  const comparableName = normalizeComparable(normalizeString(category.name));
  const comparableHandle = normalizeComparable(normalizeString(category.handle));

  return (
    comparableName.includes(comparableQuery) ||
    comparableHandle.includes(comparableQuery)
  );
};

const createCategorySuggestion = (
  category: RawSearchAutocompleteCategoryRef | RawSearchAutocompleteCategoryHit,
): SearchAutocompleteSuggestion | null => {
  const id = normalizeString(category.id);
  const handle = normalizeString(category.handle);
  const title =
    normalizeString("name" in category ? category.name : "") ||
    normalizeString("title" in category ? category.title : "") ||
    createHandleLabel(handle);

  if (!id || !handle || !title) {
    return null;
  }

  return {
    id,
    type: "category",
    title,
    href: `/c/${handle}`,
    subtitle: "Kategória",
  };
};

export const createCategorySuggestions = ({
  categoryHits,
  productHits,
  query,
  limit,
}: {
  categoryHits: RawSearchAutocompleteCategoryHit[];
  productHits: RawSearchAutocompleteProductHit[];
  query: string;
  limit: number;
}) => {
  const suggestions: SearchAutocompleteSuggestion[] = [];
  const seen = new Set<string>();

  const pushSuggestion = (suggestion: SearchAutocompleteSuggestion | null) => {
    if (!suggestion || seen.has(suggestion.href)) {
      return;
    }

    seen.add(suggestion.href);
    suggestions.push(suggestion);
  };

  for (const product of productHits) {
    for (const category of product.categories ?? []) {
      if (categoryMatchesQuery(category, query)) {
        pushSuggestion(createCategorySuggestion(category));
      }
    }
  }

  for (const hit of categoryHits) {
    pushSuggestion(createCategorySuggestion(hit));
  }

  return suggestions.slice(0, limit);
};

const resolveProducerSlug = (handle: string, title: string) => {
  const producerPathMatch = handle.match(/\/producers\/([^/]+)/);
  return createBrandSlug(producerPathMatch?.[1] || handle || title);
};

const createBrandSuggestion = (
  hit: RawSearchAutocompleteProducerHit,
): SearchAutocompleteSuggestion | null => {
  const id = normalizeString(hit.id);
  const title = normalizeString(hit.title);
  const handle = normalizeString(hit.handle);
  const slug = resolveProducerSlug(handle, title);

  if (!id || !title || !slug) {
    return null;
  }

  return {
    id,
    type: "brand",
    title,
    href: createBrandHref({ slug }),
    subtitle: "Značka",
  };
};

export const createBrandSuggestions = (
  hits: RawSearchAutocompleteProducerHit[],
) =>
  hits
    .map(createBrandSuggestion)
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item));
