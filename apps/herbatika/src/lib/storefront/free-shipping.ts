import {
  type HerbatikaCurrencyCode,
  normalizeSupportedCurrencyCode,
} from "./currency"

export const FREE_SHIPPING_THRESHOLDS: Readonly<
  Partial<Record<HerbatikaCurrencyCode, number>>
> = {
  EUR: 49,
  CZK: 1190,
  HUF: 17_900,
  RON: 249,
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
