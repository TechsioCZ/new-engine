import { normalizeSupportedCurrencyCode } from "./currency"

const FREE_SHIPPING_THRESHOLDS: Partial<Record<string, number>> = {
  EUR: 49,
}

export const resolveFreeShippingThresholdAmount = (
  currencyCode: string,
): number | null => {
  const normalizedCurrencyCode = normalizeSupportedCurrencyCode(currencyCode)
  if (normalizedCurrencyCode === null) {
    return null
  }

  const threshold: unknown = FREE_SHIPPING_THRESHOLDS[normalizedCurrencyCode]
  return typeof threshold === "number" ? threshold : null
}
