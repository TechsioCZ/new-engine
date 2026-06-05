import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import type { HerbatikaCurrencyCode } from "@/lib/storefront/currency";
import {
  resolveProductTopOffer,
  resolveStorefrontPrice,
  resolveTopOfferInStock,
} from "@/lib/storefront/product-pricing";
import { routes } from "@/lib/routes";
import type {
  RawSearchAutocompleteProductHit,
  SearchAutocompleteSuggestion,
} from "./search-autocomplete-types";
import { normalizeString } from "./search-autocomplete-normalizers";

const resolveProductPrice = (
  hit: RawSearchAutocompleteProductHit,
  expectedCurrencyCode: HerbatikaCurrencyCode,
) => {
  const calculatedPrice = hit.variants?.[0]?.calculated_price;
  const topOffer = resolveProductTopOffer(hit);

  return resolveStorefrontPrice({
    calculatedAmount: calculatedPrice?.calculated_amount,
    calculatedCurrencyCode: calculatedPrice?.currency_code,
    expectedCurrencyCode,
    topOffer,
  });
};

const resolveProductInStock = (hit: RawSearchAutocompleteProductHit) => {
  const topOffer = resolveProductTopOffer(hit);
  return resolveTopOfferInStock(topOffer);
};

const createProductSuggestion = (
  hit: RawSearchAutocompleteProductHit,
  currencyCode: HerbatikaCurrencyCode,
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
  const price = resolveProductPrice(hit, currencyCode);

  return {
    id,
    type: "product",
    title,
    href: routes.product.detail(handle),
    subtitle: [producerTitle, categoryName].filter(Boolean).join(" | "),
    imageUrl: normalizeString(hit.thumbnail) || undefined,
    priceLabel: price
      ? formatCurrencyAmount(price.currentAmount, price.currencyCode)
      : undefined,
    inStock: resolveProductInStock(hit),
  };
};

export const createProductSuggestions = (
  hits: RawSearchAutocompleteProductHit[],
  currencyCode: HerbatikaCurrencyCode,
  limit: number,
) =>
  hits
    .map((hit) => createProductSuggestion(hit, currencyCode))
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item))
    .slice(0, limit);
