import type { HttpTypes } from "@medusajs/types";

export const DEFAULT_CURRENCY_CODE = "EUR";

export const asStorefrontRecord = (
  value: unknown,
): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

export const asStorefrontString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const asStorefrontNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const asStorefrontBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }

  return null;
};

export const asCurrencyCode = (value: unknown): string | null => {
  const normalized = asStorefrontString(value)?.toUpperCase();
  return normalized ?? null;
};

export const resolveProductTopOffer = (
  product?: Pick<HttpTypes.StoreProduct, "metadata"> | null,
) => {
  const metadata = asStorefrontRecord(product?.metadata);
  return asStorefrontRecord(metadata?.top_offer);
};

export const resolveTopOfferCurrentAmount = (
  topOffer: Record<string, unknown> | null,
) => {
  return (
    asStorefrontNumber(topOffer?.current_price) ??
    asStorefrontNumber(topOffer?.action_price) ??
    asStorefrontNumber(topOffer?.price_vat)
  );
};

export const resolveTopOfferOriginalAmount = (params: {
  currentAmount: number | null;
  explicitOriginalAmount?: number | null;
  topOffer: Record<string, unknown> | null;
}) => {
  const { currentAmount, explicitOriginalAmount = null, topOffer } = params;
  const explicitCandidate =
    typeof explicitOriginalAmount === "number" &&
    Number.isFinite(explicitOriginalAmount)
      ? explicitOriginalAmount
      : null;
  const hasExplicitOriginalAmount = explicitCandidate !== null;
  const candidate =
    explicitCandidate ??
    asStorefrontNumber(topOffer?.compare_at_price) ??
    asStorefrontNumber(topOffer?.standard_price) ??
    asStorefrontNumber(topOffer?.price_vat);

  if (typeof currentAmount !== "number" || typeof candidate !== "number") {
    return null;
  }

  const hasActiveDiscount =
    asStorefrontBoolean(topOffer?.has_active_discount) === true;
  const actionAmount = asStorefrontNumber(topOffer?.action_price);
  const hasActionPriceDiscount =
    typeof actionAmount === "number" && candidate > actionAmount;

  if (
    candidate > currentAmount &&
    (hasExplicitOriginalAmount || hasActiveDiscount || hasActionPriceDiscount)
  ) {
    return candidate;
  }

  return null;
};
