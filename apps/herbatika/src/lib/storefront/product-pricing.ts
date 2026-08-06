import { getRecordValue } from "@techsio/std/object"

import { normalizeSupportedCurrencyCode } from "./currency"
import type { HerbatikaCurrencyCode as BaseHerbatikaCurrencyCode } from "./currency"
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
) => {
  const metadata = asStorefrontRecord(product?.metadata)
  return asStorefrontRecord(getRecordValue(metadata ?? {}, "top_offer"))
}

const resolveTopOfferCurrentAmount = (
  topOffer: Record<string, unknown> | null,
) =>
  asStorefrontNumber(getRecordValue(topOffer ?? {}, "current_price")) ??
  asStorefrontNumber(getRecordValue(topOffer ?? {}, "action_price")) ??
  asStorefrontNumber(getRecordValue(topOffer ?? {}, "price_vat"))

const resolveTopOfferStockAmount = (
  topOffer: Record<string, unknown> | null,
): number | null => {
  const stock = asStorefrontRecord(getRecordValue(topOffer ?? {}, "stock"))
  return asStorefrontNumber(getRecordValue(stock ?? {}, "amount"))
}

export const resolveTopOfferInStock = (
  topOffer: Record<string, unknown> | null,
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
    asStorefrontNumber(getRecordValue(topOffer ?? {}, "compare_at_price")) ??
    asStorefrontNumber(getRecordValue(topOffer ?? {}, "standard_price")) ??
    asStorefrontNumber(getRecordValue(topOffer ?? {}, "price_vat"))

  if (typeof currentAmount !== "number" || typeof candidate !== "number") {
    return null
  }

  const hasActiveDiscount =
    asStorefrontBoolean(
      getRecordValue(topOffer ?? {}, "has_active_discount"),
    ) === true
  const actionAmount = asStorefrontNumber(
    getRecordValue(topOffer ?? {}, "action_price"),
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
  topOffer: Record<string, unknown> | null
}

export interface ResolvedStorefrontPrice {
  currentAmount: number
  originalAmount: number | null
  currencyCode: HerbatikaCurrencyCode
  source: StorefrontPriceSource
}

const resolvePositiveOriginalAmount = (
  currentAmount: number,
  originalAmount: unknown,
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
    getRecordValue(topOffer ?? {}, "currency"),
  )

  if (topOfferCurrencyCode !== currencyCode) {
    return null
  }

  return resolveTopOfferOriginalAmount({
    currentAmount,
    topOffer,
  })
}

const matchesExpectedCurrency = (
  resolvedCurrency: HerbatikaCurrencyCode | null,
  expectedCurrency: HerbatikaCurrencyCode | null,
): resolvedCurrency is HerbatikaCurrencyCode => {
  if (resolvedCurrency === null) {
    return false
  }
  if (expectedCurrency === null) {
    return true
  }
  return resolvedCurrency === expectedCurrency
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
          topOffer,
        }),
      source: "calculated_price",
    }
  }

  const resolvedTopOfferAmount = resolveTopOfferCurrentAmount(topOffer)
  const resolvedTopOfferCurrency = normalizeSupportedCurrencyCode(
    getRecordValue(topOffer ?? {}, "currency"),
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
