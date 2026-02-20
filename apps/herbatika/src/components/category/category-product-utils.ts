import type { HttpTypes } from "@medusajs/types";

export const normalizeCategoryName = (value?: string | null) => {
  if (!value) {
    return "Kategória";
  }

  return value.replace(/^>\s*/, "").trim();
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
