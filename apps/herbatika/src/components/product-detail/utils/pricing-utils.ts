import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import type {
  ProductMediaFact,
  ProductOfferState,
  ProductPriceState,
  StorefrontProduct,
  VolumeDiscountOption,
} from "@/components/product-detail/product-detail.types";
import {
  DEFAULT_CURRENCY_CODE,
  asCurrencyCode,
  asStorefrontNumber,
  resolveProductTopOffer,
  resolveTopOfferCurrentAmount,
  resolveTopOfferOriginalAmount,
} from "@/lib/storefront/product-pricing";

const resolveAmountWithoutTax = (params: {
  amountWithTax: number | null;
  amountWithoutTax: number | null;
  vatRate: number | null;
}): number | null => {
  const { amountWithTax, amountWithoutTax, vatRate } = params;

  if (
    typeof amountWithoutTax === "number" &&
    amountWithoutTax > 0 &&
    (typeof amountWithTax !== "number" || amountWithoutTax <= amountWithTax)
  ) {
    return amountWithoutTax;
  }

  if (
    typeof amountWithTax === "number" &&
    typeof vatRate === "number" &&
    vatRate > 0
  ) {
    return amountWithTax / (1 + vatRate / 100);
  }

  return null;
};

export const resolvePriceState = (
  product: StorefrontProduct,
  selectedVariantId: string | null,
): ProductPriceState => {
  const variants = product.variants ?? [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  const calculatedPrice = selectedVariant?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const originalAmount = calculatedPrice?.original_amount;
  const topOffer = resolveProductTopOffer(product);
  const currentAmount =
    typeof calculatedAmount === "number"
      ? calculatedAmount
      : resolveTopOfferCurrentAmount(topOffer);
  const currencyCode =
    asCurrencyCode(calculatedPrice?.currency_code) ??
    asCurrencyCode(topOffer?.currency) ??
    DEFAULT_CURRENCY_CODE;

  const resolvedCalculatedAmount =
    typeof currentAmount === "number" ? currentAmount : null;
  const vatRate =
    asStorefrontNumber(selectedVariant?.metadata?.vat) ??
    asStorefrontNumber(topOffer?.vat);
  const explicitCalculatedAmountWithoutTax =
    typeof calculatedPrice?.calculated_amount_without_tax === "number"
      ? calculatedPrice.calculated_amount_without_tax
      : null;
  const resolvedCalculatedAmountWithoutTax = resolveAmountWithoutTax({
    amountWithTax:
      typeof resolvedCalculatedAmount === "number" ? resolvedCalculatedAmount : null,
    amountWithoutTax: explicitCalculatedAmountWithoutTax,
    vatRate,
  });

  if (typeof resolvedCalculatedAmount !== "number") {
    return {
      currentLabel: "Cena na vyžiadanie",
      originalLabel: null,
      currentAmount: null,
      currentAmountWithoutTax: null,
      originalAmount: null,
      currencyCode: currencyCode.toUpperCase(),
    };
  }

  const normalizedOriginalAmount =
    typeof originalAmount === "number" && originalAmount > resolvedCalculatedAmount
      ? originalAmount
      : resolveTopOfferOriginalAmount({
          currentAmount: resolvedCalculatedAmount,
          topOffer,
        });

  return {
    currentLabel: formatCurrencyAmount(resolvedCalculatedAmount, currencyCode),
    originalLabel:
      normalizedOriginalAmount && normalizedOriginalAmount > resolvedCalculatedAmount
        ? formatCurrencyAmount(normalizedOriginalAmount, currencyCode)
        : null,
    currentAmount: resolvedCalculatedAmount,
    currentAmountWithoutTax:
      typeof resolvedCalculatedAmountWithoutTax === "number"
        ? resolvedCalculatedAmountWithoutTax
        : null,
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

  const offerOriginalAmount =
    asStorefrontNumber(offerState.offerSource?.compare_at_price) ??
    offerState.standardAmount ??
    asStorefrontNumber(offerState.offerSource?.price_vat);

  if (
    offerState.hasActiveDiscount &&
    typeof offerOriginalAmount === "number" &&
    offerOriginalAmount > priceState.currentAmount
  ) {
    return offerOriginalAmount;
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
  isEligible: boolean,
): string | null => {
  if (!isEligible || typeof currentAmount !== "number") {
    return null;
  }

  return formatCurrencyAmount(currentAmount * 0.02, currencyCode);
};

const resolveDoseCount = (mediaFacts: ProductMediaFact[]): number | null => {
  const dosesFact = mediaFacts.find((fact) => fact.id === "doses");
  if (!dosesFact) {
    return null;
  }

  const parsed = Number.parseInt(dosesFact.value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const resolveUnitPriceLabel = (params: {
  currentAmount: number | null;
  currentAmountWithoutTax: number | null;
  currencyCode: string;
  mediaFacts: ProductMediaFact[];
  unitLabel: string | null;
  vatRate: number | null;
}): string | null => {
  const {
    currentAmount,
    currentAmountWithoutTax,
    currencyCode,
    mediaFacts,
    unitLabel,
    vatRate,
  } = params;

  if (typeof currentAmount !== "number") {
    return null;
  }

  const doseCount = resolveDoseCount(mediaFacts);
  if (typeof doseCount === "number") {
    return `${formatCurrencyAmount(currentAmount / doseCount, currencyCode)} / deň`;
  }

  if (!unitLabel) {
    return null;
  }

  const resolvedAmountWithoutTax = resolveAmountWithoutTax({
    amountWithTax: currentAmount,
    amountWithoutTax: currentAmountWithoutTax,
    vatRate,
  });

  if (typeof resolvedAmountWithoutTax === "number") {
    return `bez DPH: ${formatCurrencyAmount(resolvedAmountWithoutTax, currencyCode)} / ${unitLabel}`;
  }

  return `${formatCurrencyAmount(currentAmount, currencyCode)} / ${unitLabel}`;
};

export const resolveVolumeDiscountOptions = (
  currentAmount: number | null,
  currencyCode: string,
  isEligible: boolean,
): VolumeDiscountOption[] => {
  if (!isEligible || typeof currentAmount !== "number") {
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
