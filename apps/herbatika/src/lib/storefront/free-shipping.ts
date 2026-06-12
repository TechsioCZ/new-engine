import {
  type HerbatikaCurrencyCode,
  normalizeSupportedCurrencyCode,
} from "./currency"

const FREE_SHIPPING_THRESHOLDS: Partial<Record<HerbatikaCurrencyCode, number>> =
  {
    EUR: 49,
  }

export const resolveFreeShippingThresholdAmount = (
  currencyCode: string
): number | null => {
  const normalizedCurrencyCode = normalizeSupportedCurrencyCode(currencyCode)
  if (!normalizedCurrencyCode) {
    return null
  }

  return FREE_SHIPPING_THRESHOLDS[normalizedCurrencyCode] ?? null
}
