import { normalizeSupportedCurrencyCode } from "./currency"
import type { HerbatikaCurrencyCode } from "./currency"
import {
  asStorefrontNumber,
  asStorefrontRecord,
} from "./product-pricing-parsers"

export const resolveTopOfferCurrentAmount = (topOffer: object | null) =>
  asStorefrontNumber(
    topOffer === null ? undefined : Reflect.get(topOffer, "current_price"),
  ) ??
  asStorefrontNumber(
    topOffer === null ? undefined : Reflect.get(topOffer, "action_price"),
  ) ??
  asStorefrontNumber(
    topOffer === null ? undefined : Reflect.get(topOffer, "price_vat"),
  )

export const resolveTopOfferStockAmount = (
  topOffer: object | null,
): number | null => {
  const stock = asStorefrontRecord(
    topOffer === null ? undefined : Reflect.get(topOffer, "stock"),
  )
  return asStorefrontNumber(
    stock === null ? undefined : Reflect.get(stock, "amount"),
  )
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
    topOffer: object | null
  }) => number | null
  topOffer: object | null
}) => {
  const topOfferCurrencyCode = normalizeSupportedCurrencyCode(
    topOffer === null ? undefined : Reflect.get(topOffer, "currency"),
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
