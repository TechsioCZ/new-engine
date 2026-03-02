import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import type {
  ProductOfferState,
  ProductPriceState,
  StorefrontProduct,
  VolumeDiscountOption,
} from "@/components/product-detail/product-detail.types";
import { asNumber, asRecord } from "@/components/product-detail/utils/value-utils";

export const resolvePriceState = (
  product: StorefrontProduct,
  selectedVariantId: string | null,
): ProductPriceState => {
  const variants = product.variants ?? [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const selectedVariantMetadata = asRecord(selectedVariant?.metadata);

  const calculatedPrice = selectedVariant?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const originalAmount = calculatedPrice?.original_amount;
  const fallbackCalculatedAmount =
    asNumber(selectedVariantMetadata?.current_price) ??
    asNumber(selectedVariantMetadata?.price_vat);
  const fallbackOriginalAmount = asNumber(selectedVariantMetadata?.standard_price);
  const currencyCode =
    typeof calculatedPrice?.currency_code === "string"
      ? calculatedPrice.currency_code
      : "EUR";

  const resolvedCalculatedAmount =
    typeof calculatedAmount === "number" ? calculatedAmount : fallbackCalculatedAmount;

  if (typeof resolvedCalculatedAmount !== "number") {
    return {
      currentLabel: "Cena na vyžiadanie",
      originalLabel: null,
      currentAmount: null,
      originalAmount: null,
      currencyCode: currencyCode.toUpperCase(),
    };
  }

  const normalizedOriginalAmount =
    typeof originalAmount === "number"
      ? originalAmount
      : typeof fallbackOriginalAmount === "number"
        ? fallbackOriginalAmount
        : null;

  return {
    currentLabel: formatCurrencyAmount(resolvedCalculatedAmount, currencyCode),
    originalLabel:
      normalizedOriginalAmount && normalizedOriginalAmount > resolvedCalculatedAmount
        ? formatCurrencyAmount(normalizedOriginalAmount, currencyCode)
        : null,
    currentAmount: resolvedCalculatedAmount,
    originalAmount: normalizedOriginalAmount,
    currencyCode: currencyCode.toUpperCase(),
  };
};

export const resolveDisplayOriginalAmount = (
  priceState: ProductPriceState | null,
  offerState: ProductOfferState,
): number | null => {
  if (!priceState?.currentAmount) {
    return null;
  }

  const variantOriginalAmount = priceState.originalAmount;
  if (
    typeof variantOriginalAmount === "number" &&
    variantOriginalAmount > priceState.currentAmount
  ) {
    return variantOriginalAmount;
  }

  const offerStandardAmount = offerState.standardAmount;
  if (
    typeof offerStandardAmount === "number" &&
    offerStandardAmount > priceState.currentAmount
  ) {
    return offerStandardAmount;
  }

  return null;
};

export const resolveDiscountPercent = (
  currentAmount: number | null,
  originalAmount: number | null,
): number | null => {
  if (
    typeof currentAmount !== "number" ||
    typeof originalAmount !== "number" ||
    originalAmount <= currentAmount ||
    originalAmount <= 0
  ) {
    return null;
  }

  return Math.round(((originalAmount - currentAmount) / originalAmount) * 100);
};

export const resolveVipCreditLabel = (
  currentAmount: number | null,
  currencyCode: string,
): string | null => {
  if (typeof currentAmount !== "number") {
    return null;
  }

  return formatCurrencyAmount(currentAmount * 0.02, currencyCode);
};

export const resolveUnitPriceLabel = (params: {
  currentAmount: number | null;
  currencyCode: string;
  unitLabel: string | null;
  vatRate: number | null;
}): string | null => {
  const { currentAmount, currencyCode, unitLabel, vatRate } = params;

  if (typeof currentAmount !== "number" || !unitLabel) {
    return null;
  }

  if (typeof vatRate === "number" && vatRate > 0) {
    const withoutTaxAmount = currentAmount / (1 + vatRate / 100);
    return `bez DPH: ${formatCurrencyAmount(withoutTaxAmount, currencyCode)} / ${unitLabel}`;
  }

  return `${formatCurrencyAmount(currentAmount, currencyCode)} / ${unitLabel}`;
};

export const resolveVolumeDiscountOptions = (
  currentAmount: number | null,
  currencyCode: string,
): VolumeDiscountOption[] => {
  if (typeof currentAmount !== "number") {
    return [];
  }

  const options = [
    { quantity: 2, ratio: 0.95 },
    { quantity: 3, ratio: 0.9 },
  ];

  return options.map((option) => {
    const discountedUnitAmount = currentAmount * option.ratio;
    const discountedTotalAmount = discountedUnitAmount * option.quantity;
    const originalTotalAmount = currentAmount * option.quantity;

    return {
      id: `quantity-tier-${option.quantity}`,
      title: `Kúpte ${option.quantity} a ušetrite`,
      quantity: option.quantity,
      totalAmountLabel: formatCurrencyAmount(discountedTotalAmount, currencyCode),
      perUnitLabel: `${formatCurrencyAmount(discountedUnitAmount, currencyCode)} / kus`,
      oldTotalAmountLabel:
        discountedTotalAmount < originalTotalAmount
          ? formatCurrencyAmount(originalTotalAmount, currencyCode)
          : null,
    };
  });
};
