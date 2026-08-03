import {
  normalizeSupportedCurrencyCode,
  type HerbatikaCurrencyCode as BaseHerbatikaCurrencyCode,
} from "./currency"
import {
  asStorefrontBoolean,
  asStorefrontNumber,
  asStorefrontRecord,
} from "./product-pricing-parsers"

type HerbatikaCurrencyCode = BaseHerbatikaCurrencyCode

export {
  asStorefrontBoolean,
  asStorefrontNumber,
  asStorefrontRecord,
  asStorefrontString,
  resolveAmountWithoutTax,
} from "./product-pricing-parsers"

type StorefrontMetadataSource = {
  metadata?: unknown
}

export const resolveProductTopOffer = (
  product?: StorefrontMetadataSource | null
) => {
  const metadata = asStorefrontRecord(product?.metadata)
  return asStorefrontRecord(metadata?.["top_offer"])
}

const resolveTopOfferCurrentAmount = (
  topOffer: Record<string, unknown> | null
) =>
  asStorefrontNumber(topOffer?.["current_price"]) ??
  asStorefrontNumber(topOffer?.["action_price"]) ??
  asStorefrontNumber(topOffer?.["price_vat"])

const resolveTopOfferStockAmount = (
  topOffer: Record<string, unknown> | null
): number | null => {
  const stock = asStorefrontRecord(topOffer?.["stock"])
  return asStorefrontNumber(stock?.["amount"])
}

export const resolveTopOfferInStock = (
  topOffer: Record<string, unknown> | null
): boolean => {
  const amount = resolveTopOfferStockAmount(topOffer)
  return typeof amount === "number" ? amount > 0 : true
}

export const resolveTopOfferOriginalAmount = (params: {
  currentAmount: number | null
  explicitOriginalAmount?: number | null
  topOffer: Record<string, unknown> | null
}) => {
  const { currentAmount, explicitOriginalAmount = null, topOffer } = params
  const explicitCandidate =
    typeof explicitOriginalAmount === "number" &&
    Number.isFinite(explicitOriginalAmount)
      ? explicitOriginalAmount
      : null
  const hasExplicitOriginalAmount = explicitCandidate !== null
  const candidate =
    explicitCandidate ??
    asStorefrontNumber(topOffer?.["compare_at_price"]) ??
    asStorefrontNumber(topOffer?.["standard_price"]) ??
    asStorefrontNumber(topOffer?.["price_vat"])

  if (typeof currentAmount !== "number" || typeof candidate !== "number") {
    return null
  }

  const hasActiveDiscount =
    asStorefrontBoolean(topOffer?.["has_active_discount"]) === true
  const actionAmount = asStorefrontNumber(topOffer?.["action_price"])
  const hasActionPriceDiscount =
    typeof actionAmount === "number" && candidate > actionAmount

  if (
    candidate > currentAmount &&
    (hasExplicitOriginalAmount || hasActiveDiscount || hasActionPriceDiscount)
  ) {
    return candidate
  }

  return null
}

type StorefrontPriceSource = "calculated_price" | "top_offer"

type StorefrontPriceInput = {
  calculatedAmount: unknown
  calculatedCurrencyCode: unknown
  calculatedOriginalAmount?: unknown
  expectedCurrencyCode?: unknown
  topOffer: Record<string, unknown> | null
}

export type ResolvedStorefrontPrice = {
  currentAmount: number
  originalAmount: number | null
  currencyCode: HerbatikaCurrencyCode
  source: StorefrontPriceSource
}

const resolvePositiveOriginalAmount = (
  currentAmount: number,
  originalAmount: unknown
): number | null => {
  const normalizedOriginalAmount = asStorefrontNumber(originalAmount)

  return typeof normalizedOriginalAmount === "number" &&
    normalizedOriginalAmount > currentAmount
    ? normalizedOriginalAmount
    : null
}

const resolveMatchingTopOfferOriginalAmount = ({
  currentAmount,
  currencyCode,
  topOffer,
}: {
  currentAmount: number
  currencyCode: HerbatikaCurrencyCode
  topOffer: Record<string, unknown> | null
}) => {
  const topOfferCurrencyCode = normalizeSupportedCurrencyCode(
    topOffer?.["currency"]
  )

  if (topOfferCurrencyCode !== currencyCode) {
    return null
  }

  return resolveTopOfferOriginalAmount({
    currentAmount,
    topOffer,
  })
}

export const resolveStorefrontPrice = ({
  calculatedAmount,
  calculatedCurrencyCode,
  calculatedOriginalAmount,
  expectedCurrencyCode,
  topOffer,
}: StorefrontPriceInput): ResolvedStorefrontPrice | null => {
  const expectedCurrency = normalizeSupportedCurrencyCode(expectedCurrencyCode)
  const resolvedCalculatedAmount = asStorefrontNumber(calculatedAmount)
  const resolvedCalculatedCurrency = normalizeSupportedCurrencyCode(
    calculatedCurrencyCode
  )

  if (
    typeof resolvedCalculatedAmount === "number" &&
    resolvedCalculatedCurrency &&
    (!expectedCurrency || resolvedCalculatedCurrency === expectedCurrency)
  ) {
    return {
      currentAmount: resolvedCalculatedAmount,
      originalAmount:
        resolvePositiveOriginalAmount(
          resolvedCalculatedAmount,
          calculatedOriginalAmount
        ) ??
        resolveMatchingTopOfferOriginalAmount({
          currentAmount: resolvedCalculatedAmount,
          currencyCode: resolvedCalculatedCurrency,
          topOffer,
        }),
      currencyCode: resolvedCalculatedCurrency,
      source: "calculated_price",
    }
  }

  const resolvedTopOfferAmount = resolveTopOfferCurrentAmount(topOffer)
  const resolvedTopOfferCurrency = normalizeSupportedCurrencyCode(
    topOffer?.["currency"]
  )

  if (
    typeof resolvedTopOfferAmount === "number" &&
    resolvedTopOfferCurrency &&
    (!expectedCurrency || resolvedTopOfferCurrency === expectedCurrency)
  ) {
    return {
      currentAmount: resolvedTopOfferAmount,
      originalAmount: resolveTopOfferOriginalAmount({
        currentAmount: resolvedTopOfferAmount,
        topOffer,
      }),
      currencyCode: resolvedTopOfferCurrency,
      source: "top_offer",
    }
  }

  return null
}
