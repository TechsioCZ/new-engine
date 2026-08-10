import { normalizeSupportedCurrencyCode } from "./currency"
import type { HerbatikaCurrencyCode as BaseHerbatikaCurrencyCode } from "./currency"
import {
  matchesExpectedCurrency,
  resolveMatchingTopOfferOriginalAmount,
  resolvePositiveOriginalAmount,
  resolveTopOfferCurrentAmount,
  resolveTopOfferStockAmount,
} from "./product-pricing-candidates"
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

interface StorefrontMetadataSource {
  metadata?: unknown
}

export const resolveProductTopOffer = (
  product?: StorefrontMetadataSource | null,
): object | null => {
  const metadata = asStorefrontRecord(product?.metadata)
  return asStorefrontRecord(
    metadata === null ? undefined : Reflect.get(metadata, "top_offer"),
  )
}

export const resolveTopOfferInStock = (topOffer: object | null): boolean => {
  const amount = resolveTopOfferStockAmount(topOffer)
  return typeof amount === "number" ? amount > 0 : true
}

export const resolveTopOfferOriginalAmount = (params: {
  currentAmount: number | null
  explicitOriginalAmount?: number | null
  topOffer: object | null
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
    asStorefrontNumber(
      topOffer === null ? undefined : Reflect.get(topOffer, "compare_at_price"),
    ) ??
    asStorefrontNumber(
      topOffer === null ? undefined : Reflect.get(topOffer, "standard_price"),
    ) ??
    asStorefrontNumber(
      topOffer === null ? undefined : Reflect.get(topOffer, "price_vat"),
    )

  if (typeof currentAmount !== "number" || typeof candidate !== "number") {
    return null
  }

  const hasActiveDiscount =
    asStorefrontBoolean(
      topOffer === null
        ? undefined
        : Reflect.get(topOffer, "has_active_discount"),
    ) === true
  const actionAmount = asStorefrontNumber(
    topOffer === null ? undefined : Reflect.get(topOffer, "action_price"),
  )
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

export type StorefrontPriceSource = "calculated_price" | "top_offer"

interface StorefrontPriceInput {
  calculatedAmount: unknown
  calculatedCurrencyCode: unknown
  calculatedOriginalAmount?: unknown
  expectedCurrencyCode?: unknown
  topOffer: object | null
}

export interface ResolvedStorefrontPrice {
  currentAmount: number
  originalAmount: number | null
  currencyCode: HerbatikaCurrencyCode
  source: StorefrontPriceSource
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
    calculatedCurrencyCode,
  )

  if (
    typeof resolvedCalculatedAmount === "number" &&
    matchesExpectedCurrency(resolvedCalculatedCurrency, expectedCurrency)
  ) {
    return {
      currencyCode: resolvedCalculatedCurrency,
      currentAmount: resolvedCalculatedAmount,
      originalAmount:
        resolvePositiveOriginalAmount(
          resolvedCalculatedAmount,
          calculatedOriginalAmount,
        ) ??
        resolveMatchingTopOfferOriginalAmount({
          currencyCode: resolvedCalculatedCurrency,
          currentAmount: resolvedCalculatedAmount,
          resolveOriginalAmount: resolveTopOfferOriginalAmount,
          topOffer,
        }),
      source: "calculated_price",
    }
  }

  const resolvedTopOfferAmount = resolveTopOfferCurrentAmount(topOffer)
  const resolvedTopOfferCurrency = normalizeSupportedCurrencyCode(
    topOffer === null ? undefined : Reflect.get(topOffer, "currency"),
  )

  if (
    typeof resolvedTopOfferAmount === "number" &&
    matchesExpectedCurrency(resolvedTopOfferCurrency, expectedCurrency)
  ) {
    return {
      currencyCode: resolvedTopOfferCurrency,
      currentAmount: resolvedTopOfferAmount,
      originalAmount: resolveTopOfferOriginalAmount({
        currentAmount: resolvedTopOfferAmount,
        topOffer,
      }),
      source: "top_offer",
    }
  }

  return null
}
