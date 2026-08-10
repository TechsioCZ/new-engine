import type {
  Product,
  ProductPriceState,
  VolumeDiscountOption,
} from "@/components/product-detail/product-detail.types"
import {
  DEFAULT_CURRENCY_CODE,
  resolveSupportedCurrencyCode,
} from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import {
  resolveProductTopOffer,
  resolveStorefrontPrice,
} from "@/lib/storefront/product-pricing"
import { resolveVariantPricePerUnit } from "@/lib/storefront/unit-price"

export const resolvePriceState = (
  product: Product,
  selectedVariantId: string | null,
  expectedCurrencyCode: string | null | undefined,
  priceUnavailableLabel: string,
): ProductPriceState => {
  const variants = product.variants ?? []
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0]

  const calculatedPrice = selectedVariant?.calculated_price
  const topOffer = resolveProductTopOffer(product)
  const price = resolveStorefrontPrice({
    calculatedAmount: calculatedPrice?.calculated_amount,
    calculatedCurrencyCode: calculatedPrice?.currency_code,
    calculatedOriginalAmount: calculatedPrice?.original_amount,
    expectedCurrencyCode,
    topOffer,
  })

  const resolvedCalculatedAmount =
    typeof price?.currentAmount === "number" ? price.currentAmount : null
  const currencyCode =
    price?.currencyCode ??
    resolveSupportedCurrencyCode(expectedCurrencyCode, DEFAULT_CURRENCY_CODE)
  if (typeof resolvedCalculatedAmount !== "number" || !price) {
    return {
      currencyCode: currencyCode.toUpperCase(),
      currentAmount: null,
      currentLabel: priceUnavailableLabel,
      originalAmount: null,
      originalLabel: null,
      pricePerUnit: null,
    }
  }

  const normalizedOriginalAmount = price?.originalAmount ?? null

  return {
    currencyCode: currencyCode.toUpperCase(),
    currentAmount: resolvedCalculatedAmount,
    currentLabel: formatCurrencyAmount(resolvedCalculatedAmount, currencyCode),
    originalAmount: normalizedOriginalAmount,
    originalLabel:
      normalizedOriginalAmount !== null &&
      normalizedOriginalAmount > resolvedCalculatedAmount
        ? formatCurrencyAmount(normalizedOriginalAmount, currencyCode)
        : null,
    pricePerUnit: resolveVariantPricePerUnit(selectedVariant, {
      currencyCode: price.currencyCode,
      source: price.source,
    }),
  }
}

export const resolveDisplayOriginalAmount = (
  priceState: ProductPriceState | null,
): number | null => {
  if (typeof priceState?.currentAmount !== "number") {
    return null
  }

  return typeof priceState.originalAmount === "number" &&
    priceState.originalAmount > priceState.currentAmount
    ? priceState.originalAmount
    : null
}

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
    return null
  }

  return Math.round(((originalAmount - currentAmount) / originalAmount) * 100)
}

export const resolveVipCreditLabel = (
  currentAmount: number | null,
  currencyCode: string,
  isEligible: boolean,
): string | null => {
  if (!isEligible || typeof currentAmount !== "number") {
    return null
  }

  return formatCurrencyAmount(currentAmount * 0.02, currencyCode)
}

export const resolveVolumeDiscountOptions = (
  currentAmount: number | null,
  currencyCode: string,
  isEligible: boolean,
  labels: {
    title: (quantity: number) => string
    perUnit: (price: string) => string
  },
): VolumeDiscountOption[] => {
  if (!isEligible || typeof currentAmount !== "number") {
    return []
  }

  const options = [
    { quantity: 2, ratio: 0.95 },
    { quantity: 3, ratio: 0.9 },
  ]

  return options.map((option) => {
    const discountedUnitAmount = currentAmount * option.ratio
    const discountedTotalAmount = discountedUnitAmount * option.quantity
    const originalTotalAmount = currentAmount * option.quantity

    return {
      id: `quantity-tier-${option.quantity}`,
      oldTotalAmountLabel:
        discountedTotalAmount < originalTotalAmount
          ? formatCurrencyAmount(originalTotalAmount, currencyCode)
          : null,
      perUnitLabel: labels.perUnit(
        formatCurrencyAmount(discountedUnitAmount, currencyCode),
      ),
      quantity: option.quantity,
      title: labels.title(option.quantity),
      totalAmountLabel: formatCurrencyAmount(
        discountedTotalAmount,
        currencyCode,
      ),
    }
  })
}
