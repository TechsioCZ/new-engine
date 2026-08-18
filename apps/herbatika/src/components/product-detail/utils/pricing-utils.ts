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
import type { VolumeDiscountTier } from "@/lib/storefront/volume-discounts-contract"

export const resolvePriceState = (
  product: Product,
  selectedVariantId: string | null,
  expectedCurrencyCode: string | null | undefined,
  priceUnavailableLabel: string
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
      currentLabel: priceUnavailableLabel,
      originalLabel: null,
      currentAmount: null,
      originalAmount: null,
      currencyCode: currencyCode.toUpperCase(),
      pricePerUnit: null,
    }
  }

  const normalizedOriginalAmount = price?.originalAmount ?? null

  return {
    currentLabel: formatCurrencyAmount(resolvedCalculatedAmount, currencyCode),
    originalLabel:
      normalizedOriginalAmount &&
      normalizedOriginalAmount > resolvedCalculatedAmount
        ? formatCurrencyAmount(normalizedOriginalAmount, currencyCode)
        : null,
    currentAmount: resolvedCalculatedAmount,
    originalAmount: normalizedOriginalAmount,
    currencyCode: currencyCode.toUpperCase(),
    pricePerUnit: resolveVariantPricePerUnit(selectedVariant, {
      currencyCode: price.currencyCode,
      source: price.source,
    }),
  }
}

export const resolveDisplayOriginalAmount = (
  priceState: ProductPriceState | null
): number | null => {
  if (!priceState?.currentAmount) {
    return null
  }

  return typeof priceState.originalAmount === "number" &&
    priceState.originalAmount > priceState.currentAmount
    ? priceState.originalAmount
    : null
}

export const resolveDiscountPercent = (
  currentAmount: number | null,
  originalAmount: number | null
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
  isEligible: boolean
): string | null => {
  if (!isEligible || typeof currentAmount !== "number") {
    return null
  }

  return formatCurrencyAmount(currentAmount * 0.02, currencyCode)
}

export const resolveVolumeDiscountOptions = (
  currentAmount: number | null,
  currencyCode: string,
  tiers: VolumeDiscountTier[],
  labels: {
    title: (quantity: number) => string
    perUnit: (price: string) => string
  }
): VolumeDiscountOption[] => {
  if (typeof currentAmount !== "number") {
    return []
  }

  return tiers.flatMap((tier) => {
    if (
      tier.currency_code.toUpperCase() !== currencyCode.toUpperCase() ||
      !Number.isFinite(tier.unit_amount) ||
      !Number.isFinite(tier.total_amount) ||
      tier.unit_amount < 0 ||
      tier.total_amount < 0
    ) {
      return []
    }

    const originalTotalAmount = currentAmount * tier.minimum_quantity

    return [
      {
        id: tier.promotion_id,
        percentage: tier.percentage,
        title: labels.title(tier.minimum_quantity),
        quantity: tier.minimum_quantity,
        totalAmountLabel: formatCurrencyAmount(tier.total_amount, currencyCode),
        perUnitLabel: labels.perUnit(
          formatCurrencyAmount(tier.unit_amount, currencyCode)
        ),
        oldTotalAmountLabel:
          tier.total_amount < originalTotalAmount
            ? formatCurrencyAmount(originalTotalAmount, currencyCode)
            : null,
      },
    ]
  })
}
