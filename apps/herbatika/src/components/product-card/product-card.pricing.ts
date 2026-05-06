import type { HttpTypes } from "@medusajs/types";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import {
  DEFAULT_CURRENCY_CODE,
  asCurrencyCode,
  resolveProductTopOffer,
  resolveTopOfferCurrentAmount,
  resolveTopOfferOriginalAmount,
} from "@/lib/storefront/product-pricing";
import type { ProductPriceState } from "./product-card.types";

export const resolvePriceState = (
  product: HttpTypes.StoreProduct,
): ProductPriceState => {
  const calculatedPrice = product.variants?.[0]?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const calculatedOriginalAmount = calculatedPrice?.original_amount;
  const topOffer = resolveProductTopOffer(product);

  const currentAmount =
    typeof calculatedAmount === "number"
      ? calculatedAmount
      : resolveTopOfferCurrentAmount(topOffer);
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
  const offerOriginal = resolveTopOfferOriginalAmount({
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
