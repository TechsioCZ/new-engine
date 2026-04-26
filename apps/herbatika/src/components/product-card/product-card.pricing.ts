import type { HttpTypes } from "@medusajs/types";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { asBoolean, asNumber, asRecord } from "./product-card.parsers";
import type { ProductPriceState } from "./product-card.types";

const DEFAULT_CURRENCY_CODE = "EUR";

const asCurrencyCode = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

const resolveTopOffer = (product: HttpTypes.StoreProduct) => {
  const metadata = asRecord(product.metadata);

  return asRecord(metadata?.top_offer);
};

const resolveOfferCurrentAmount = (
  topOffer: Record<string, unknown> | null,
) => {
  return (
    asNumber(topOffer?.current_price) ??
    asNumber(topOffer?.action_price) ??
    asNumber(topOffer?.price_vat)
  );
};

const resolveOfferOriginalAmount = (params: {
  currentAmount: number | null;
  topOffer: Record<string, unknown> | null;
}) => {
  const { currentAmount, topOffer } = params;
  const candidate =
    asNumber(topOffer?.compare_at_price) ??
    asNumber(topOffer?.standard_price) ??
    asNumber(topOffer?.price_vat);

  if (typeof currentAmount !== "number" || typeof candidate !== "number") {
    return null;
  }

  const hasActiveDiscount = asBoolean(topOffer?.has_active_discount) === true;
  const actionAmount = asNumber(topOffer?.action_price);
  const hasActionPriceDiscount =
    typeof actionAmount === "number" && candidate > actionAmount;

  if (
    (hasActiveDiscount || hasActionPriceDiscount) &&
    candidate > currentAmount
  ) {
    return candidate;
  }

  return null;
};

export const resolvePriceState = (
  product: HttpTypes.StoreProduct,
): ProductPriceState => {
  const calculatedPrice = product.variants?.[0]?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const calculatedOriginalAmount = calculatedPrice?.original_amount;
  const topOffer = resolveTopOffer(product);

  const currentAmount =
    typeof calculatedAmount === "number"
      ? calculatedAmount
      : resolveOfferCurrentAmount(topOffer);
  const currencyCode =
    asCurrencyCode(calculatedPrice?.currency_code) ??
    asCurrencyCode(topOffer?.currency) ??
    DEFAULT_CURRENCY_CODE;

  const calculatedOriginal =
    typeof calculatedOriginalAmount === "number" &&
    typeof currentAmount === "number" &&
    calculatedOriginalAmount > currentAmount
      ? calculatedOriginalAmount
      : null;
  const offerOriginal = resolveOfferOriginalAmount({
    currentAmount,
    topOffer,
  });
  const originalAmount = calculatedOriginal ?? offerOriginal;

  if (typeof currentAmount !== "number") {
    return {
      currentLabel: "Cena na vyžiadanie",
      originalLabel: null,
      currentAmount: null,
      originalAmount: null,
      currencyCode,
    };
  }

  const currentLabel = formatCurrencyAmount(currentAmount, currencyCode);
  const originalLabel =
    typeof originalAmount === "number" && originalAmount > currentAmount
      ? formatCurrencyAmount(originalAmount, currencyCode)
      : null;

  return {
    currentLabel,
    originalLabel,
    currentAmount,
    originalAmount,
    currencyCode: currencyCode.toUpperCase(),
  };
};

export const resolveDiscountLabel = (
  price: ProductPriceState,
): string | null => {
  if (
    typeof price.currentAmount !== "number" ||
    typeof price.originalAmount !== "number" ||
    price.originalAmount <= price.currentAmount
  ) {
    return null;
  }

  const discountAmount = price.originalAmount - price.currentAmount;
  return `–${formatCurrencyAmount(discountAmount, price.currencyCode)}`;
};

export const getProductPriceLabel = (
  product: HttpTypes.StoreProduct,
): string => {
  return resolvePriceState(product).currentLabel;
};
