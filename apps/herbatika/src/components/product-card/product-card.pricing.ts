import type { HttpTypes } from "@medusajs/types";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { asNumber, asRecord } from "./product-card.parsers";
import type { ProductPriceState, TopOfferPriceState } from "./product-card.types";

const resolveTopOfferPriceState = (
  product: HttpTypes.StoreProduct,
): TopOfferPriceState => {
  const metadata = asRecord(product.metadata);
  const topOffer = asRecord(metadata?.top_offer);

  if (!topOffer) {
    return {
      currentAmount: null,
      originalAmount: null,
      currencyCode: "EUR",
    };
  }

  const currencyCode =
    typeof topOffer.currency === "string" && topOffer.currency.length === 3
      ? topOffer.currency
      : "EUR";

  const currentAmount =
    asNumber(topOffer.current_price) ??
    asNumber(topOffer.action_price) ??
    asNumber(topOffer.price_vat);
  const compareAtAmount =
    asNumber(topOffer.compare_at_price) ?? asNumber(topOffer.standard_price);
  const originalAmount =
    currentAmount !== null &&
    compareAtAmount !== null &&
    compareAtAmount > currentAmount
      ? compareAtAmount
      : null;

  return {
    currentAmount,
    originalAmount,
    currencyCode,
  };
};

export const resolvePriceState = (
  product: HttpTypes.StoreProduct,
): ProductPriceState => {
  const calculatedPrice = product.variants?.[0]?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const calculatedOriginalAmount = calculatedPrice?.original_amount;
  const topOfferPrice = resolveTopOfferPriceState(product);

  const currentAmount =
    typeof calculatedAmount === "number"
      ? calculatedAmount
      : topOfferPrice.currentAmount;
  const currencyCode =
    typeof calculatedPrice?.currency_code === "string"
      ? calculatedPrice.currency_code
      : topOfferPrice.currencyCode;

  const originalAmount =
    typeof calculatedOriginalAmount === "number" &&
    typeof currentAmount === "number" &&
    calculatedOriginalAmount > currentAmount
      ? calculatedOriginalAmount
      : typeof topOfferPrice.originalAmount === "number" &&
          typeof currentAmount === "number" &&
          topOfferPrice.originalAmount > currentAmount
        ? topOfferPrice.originalAmount
        : null;

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
    currencyCode,
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
  return `-${formatCurrencyAmount(discountAmount, price.currencyCode)}`;
};

export const getProductPriceLabel = (
  product: HttpTypes.StoreProduct,
): string => {
  return resolvePriceState(product).currentLabel;
};
