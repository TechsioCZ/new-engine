import type {
  Product,
  ProductMediaFact,
  ProductPriceState,
  VolumeDiscountOption,
} from "@/components/product-detail/product-detail.types";
import {
  DEFAULT_CURRENCY_CODE,
  resolveSupportedCurrencyCode,
} from "@/lib/storefront/currency";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import {
  asStorefrontNumber,
  resolveAmountWithoutTax,
  resolveProductTopOffer,
  resolveStorefrontPrice,
} from "@/lib/storefront/product-pricing";

export const resolvePriceState = (
  product: Product,
  selectedVariantId: string | null,
  expectedCurrencyCode?: string | null,
): ProductPriceState => {
  const variants = product.variants ?? [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  const calculatedPrice = selectedVariant?.calculated_price;
  const topOffer = resolveProductTopOffer(product);
  const price = resolveStorefrontPrice({
    calculatedAmount: calculatedPrice?.calculated_amount,
    calculatedCurrencyCode: calculatedPrice?.currency_code,
    calculatedOriginalAmount: calculatedPrice?.original_amount,
    expectedCurrencyCode,
    topOffer,
  });

  const resolvedCalculatedAmount =
    typeof price?.currentAmount === "number" ? price.currentAmount : null;
  const currencyCode =
    price?.currencyCode ??
    resolveSupportedCurrencyCode(expectedCurrencyCode, DEFAULT_CURRENCY_CODE);
  const vatRate =
    asStorefrontNumber(selectedVariant?.metadata?.vat) ??
    asStorefrontNumber(topOffer?.vat);
  const explicitCalculatedAmountWithoutTax =
    price?.source === "calculated_price" &&
    typeof calculatedPrice?.calculated_amount_without_tax === "number"
      ? calculatedPrice.calculated_amount_without_tax
      : null;
  const resolvedCalculatedAmountWithoutTax = resolveAmountWithoutTax({
    amountWithTax:
      typeof resolvedCalculatedAmount === "number"
        ? resolvedCalculatedAmount
        : null,
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

  const normalizedOriginalAmount = price?.originalAmount ?? null;

  return {
    currentLabel: formatCurrencyAmount(resolvedCalculatedAmount, currencyCode),
    originalLabel:
      normalizedOriginalAmount &&
      normalizedOriginalAmount > resolvedCalculatedAmount
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
): number | null => {
  if (!priceState?.currentAmount) {
    return null;
  }

  return typeof priceState.originalAmount === "number" &&
    priceState.originalAmount > priceState.currentAmount
    ? priceState.originalAmount
    : null;
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
      totalAmountLabel: formatCurrencyAmount(
        discountedTotalAmount,
        currencyCode,
      ),
      perUnitLabel: `${formatCurrencyAmount(discountedUnitAmount, currencyCode)} / kus`,
      oldTotalAmountLabel:
        discountedTotalAmount < originalTotalAmount
          ? formatCurrencyAmount(originalTotalAmount, currencyCode)
          : null,
    };
  });
};
