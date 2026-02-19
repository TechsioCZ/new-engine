import type { HttpTypes } from "@medusajs/types";

export const normalizeCategoryName = (value?: string | null) => {
  if (!value) {
    return "Kategória";
  }

  return value.replace(/^>\s*/, "").trim();
};

export const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred.";
};

export const resolveCategoryRank = (
  category: HttpTypes.StoreProductCategory,
) => {
  if (typeof category.rank === "number") {
    return category.rank;
  }

  return Number.MAX_SAFE_INTEGER;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

export const resolveProductPriceAmount = (
  product: HttpTypes.StoreProduct,
): number | null => {
  const amount = product.variants?.[0]?.calculated_price?.calculated_amount;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
};

export const resolveProductCurrencyCode = (
  products: HttpTypes.StoreProduct[],
): string => {
  for (const product of products) {
    const code = product.variants?.[0]?.calculated_price?.currency_code;
    if (typeof code === "string" && code.length === 3) {
      return code.toUpperCase();
    }
  }

  return "EUR";
};

export const resolveProductInStock = (
  product: HttpTypes.StoreProduct,
): boolean => {
  const metadata = asRecord(product.metadata);
  const topOffer = asRecord(metadata?.top_offer);
  const stock = asRecord(topOffer?.stock);
  const amount = stock?.amount;

  if (typeof amount === "number") {
    return amount > 0;
  }

  return true;
};

export type PriceBandDefinition = {
  id: string;
  min: number;
  maxExclusive: number | null;
};

export const buildPriceBandDefinitions = (
  amounts: number[],
): PriceBandDefinition[] => {
  if (amounts.length === 0) {
    return [];
  }

  const minimum = Math.floor(Math.min(...amounts));
  const maximum = Math.ceil(Math.max(...amounts));

  if (minimum >= maximum) {
    return [
      {
        id: `price-${minimum}-plus`,
        min: minimum,
        maxExclusive: null,
      },
    ];
  }

  const bandCount = 4;
  const span = maximum - minimum;
  const step = Math.max(Math.ceil(span / bandCount), 1);
  const definitions: PriceBandDefinition[] = [];

  for (let index = 0; index < bandCount; index += 1) {
    const start = minimum + index * step;
    if (start > maximum) {
      break;
    }

    const nextBoundary = start + step;
    const maxExclusive = nextBoundary > maximum ? null : nextBoundary;

    definitions.push({
      id: `price-${start}-${maxExclusive ?? "plus"}`,
      min: start,
      maxExclusive,
    });

    if (maxExclusive === null) {
      break;
    }
  }

  return definitions;
};

export const matchesPriceBand = (
  amount: number,
  definition: PriceBandDefinition,
) => {
  if (definition.maxExclusive === null) {
    return amount >= definition.min;
  }

  return amount >= definition.min && amount < definition.maxExclusive;
};

export const formatAmount = (amount: number, currencyCode: string): string => {
  const locale = currencyCode === "CZK" ? "cs-CZ" : "sk-SK";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currencyCode}`;
  }
};

export const formatPriceBandLabel = (
  definition: PriceBandDefinition,
  currencyCode: string,
): string => {
  if (definition.maxExclusive === null) {
    return `${formatAmount(definition.min, currencyCode)}+`;
  }

  return `${formatAmount(definition.min, currencyCode)} - ${formatAmount(
    definition.maxExclusive,
    currencyCode,
  )}`;
};

export const toggleSelection = (currentItems: string[], itemId: string) => {
  if (currentItems.includes(itemId)) {
    return currentItems.filter((existingId) => existingId !== itemId);
  }

  return [...currentItems, itemId];
};
