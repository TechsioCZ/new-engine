export const DEFAULT_CURRENCY_CODE = "EUR"

export type HerbatikaCurrencyCode = string

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/

export const normalizeSupportedCurrencyCode = (
  value: unknown
): HerbatikaCurrencyCode | null => {
  if (typeof value !== "string") {
    return null
  }

  const normalizedCurrencyCode = value.trim().toUpperCase()
  return CURRENCY_CODE_PATTERN.test(normalizedCurrencyCode)
    ? normalizedCurrencyCode
    : null
}

export const resolveSupportedCurrencyCode = (
  value: unknown,
  fallbackCurrencyCode: HerbatikaCurrencyCode = DEFAULT_CURRENCY_CODE
): HerbatikaCurrencyCode =>
  normalizeSupportedCurrencyCode(value) ?? fallbackCurrencyCode
