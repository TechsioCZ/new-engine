import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import {
  asCurrencyCode,
  asStorefrontRecord,
  resolveTopOfferCurrentAmount,
} from "@/lib/storefront/product-pricing";
import type {
  RawSearchAutocompleteProductHit,
  SearchAutocompleteSuggestion,
} from "./search-autocomplete-types";
import {
  type CurrencyCode,
  normalizeString,
} from "./search-autocomplete-normalizers";

const resolveProductTopOffer = (hit: RawSearchAutocompleteProductHit) => {
  const metadata = asStorefrontRecord(hit.metadata);
  return asStorefrontRecord(metadata?.top_offer);
};

const resolveProductPrice = (
  hit: RawSearchAutocompleteProductHit,
  fallbackCurrencyCode: CurrencyCode,
) => {
  const requestedCurrencyCode = fallbackCurrencyCode;
  const calculatedPrice = hit.variants?.[0]?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const calculatedCurrencyCode = asCurrencyCode(calculatedPrice?.currency_code);

  if (
    typeof calculatedAmount === "number" &&
    calculatedCurrencyCode === requestedCurrencyCode
  ) {
    return {
      amount: calculatedAmount,
      currencyCode: calculatedCurrencyCode,
    };
  }

  const topOffer = resolveProductTopOffer(hit);
  const topOfferAmount = resolveTopOfferCurrentAmount(topOffer);
  const topOfferCurrencyCode = asCurrencyCode(topOffer?.currency);

  if (
    typeof topOfferAmount === "number" &&
    topOfferCurrencyCode === requestedCurrencyCode
  ) {
    return {
      amount: topOfferAmount,
      currencyCode: topOfferCurrencyCode,
    };
  }

  return null;
};

const resolveProductInStock = (hit: RawSearchAutocompleteProductHit) => {
  const topOffer = resolveProductTopOffer(hit);
  const stock = asStorefrontRecord(topOffer?.stock);
  const amount = stock?.amount;

  return typeof amount === "number" ? amount > 0 : true;
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
  const price = resolveProductPrice(hit, currencyCode);

  return {
    id,
    type: "product",
    title,
    href: `/p/${handle}`,
    subtitle: [producerTitle, categoryName].filter(Boolean).join(" | "),
    imageUrl: normalizeString(hit.thumbnail) || undefined,
    priceLabel: price
      ? formatCurrencyAmount(price.amount, price.currencyCode)
      : undefined,
    inStock: resolveProductInStock(hit),
  };
};

export const createProductSuggestions = (
  hits: RawSearchAutocompleteProductHit[],
  currencyCode: CurrencyCode,
  limit: number,
) =>
  hits
    .map((hit) => createProductSuggestion(hit, currencyCode))
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item))
    .slice(0, limit);
