import type { HttpTypes } from "@medusajs/types";
import { resolveOfferStockAmount, resolveTopOffer } from "./offer-utils";
import { asFiniteNumber } from "./value-utils";

export const normalizeCategoryName = (value?: string | null) => {
  if (!value) {
    return "Kateg\u00f3ria";
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

export const resolveProductPriceAmount = (
  product: HttpTypes.StoreProduct,
): number | null => {
  return asFiniteNumber(
    product.variants?.[0]?.calculated_price?.calculated_amount,
  );
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
  const stockAmount = resolveOfferStockAmount(
    resolveTopOffer(product.metadata),
  );
  return stockAmount === null ? true : stockAmount > 0;
};
