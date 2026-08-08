import { getRecordValue } from "@techsio/std/object"

import { normalizeSupportedCurrencyCode } from "./currency"
import type { HerbatikaCurrencyCode } from "./currency"
import {
  asStorefrontNumber,
  asStorefrontRecord,
} from "./product-pricing-parsers"

export const resolveTopOfferCurrentAmount = (
  topOffer: Record<string, unknown> | null,
) =>
  asStorefrontNumber(getRecordValue(topOffer ?? {}, "current_price")) ??
  asStorefrontNumber(getRecordValue(topOffer ?? {}, "action_price")) ??
  asStorefrontNumber(getRecordValue(topOffer ?? {}, "price_vat"))

export const resolveTopOfferStockAmount = (
  topOffer: Record<string, unknown> | null,
): number | null => {
  const stock = asStorefrontRecord(getRecordValue(topOffer ?? {}, "stock"))
  return asStorefrontNumber(getRecordValue(stock ?? {}, "amount"))
}

export const resolvePositiveOriginalAmount = (
  currentAmount: number,
  originalAmount: unknown,
): number | null => {
  const normalizedOriginalAmount = asStorefrontNumber(originalAmount)

  return typeof normalizedOriginalAmount === "number" &&
    normalizedOriginalAmount > currentAmount
    ? normalizedOriginalAmount
    : null
}

export const resolveMatchingTopOfferOriginalAmount = ({
  currentAmount,
  currencyCode,
  resolveOriginalAmount,
  topOffer,
}: {
  currentAmount: number
  currencyCode: HerbatikaCurrencyCode
  resolveOriginalAmount: (params: {
    currentAmount: number
    topOffer: Record<string, unknown> | null
  }) => number | null
  topOffer: Record<string, unknown> | null
}) => {
  const topOfferCurrencyCode = normalizeSupportedCurrencyCode(
    getRecordValue(topOffer ?? {}, "currency"),
  )

  if (topOfferCurrencyCode !== currencyCode) {
    return null
  }

  return resolveOriginalAmount({ currentAmount, topOffer })
}

export const matchesExpectedCurrency = (
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
