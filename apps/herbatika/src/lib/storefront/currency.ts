export const DEFAULT_CURRENCY_CODE = "EUR"

export type HerbatikaCurrencyCode = "EUR" | "CZK"

export const normalizeSupportedCurrencyCode = (
  value: unknown
): HerbatikaCurrencyCode | null => {
  if (typeof value !== "string") {
    return null
  }

  const normalizedCurrencyCode = value.trim().toUpperCase()
  if (normalizedCurrencyCode === "EUR" || normalizedCurrencyCode === "CZK") {
    return normalizedCurrencyCode
  }

  return null
}

export const resolveSupportedCurrencyCode = (
  value: unknown,
  fallbackCurrencyCode: HerbatikaCurrencyCode = DEFAULT_CURRENCY_CODE
): HerbatikaCurrencyCode =>
  normalizeSupportedCurrencyCode(value) ?? fallbackCurrencyCode
