const FACET_PRICE_CURRENCY_BY_PROFILE_LOCALE = {
  "cs-cz": "czk",
  "hu-hu": "huf",
  "ro-ro": "ron",
  "sk-sk": "eur",
} as const

export type FacetPriceCurrencyScope = Readonly<{
  pricingContextCurrencyCode?: string
  requestedCurrencyCode?: string
}>

const normalizeCode = (value: string): string => value.trim().toLowerCase()

const normalizeLocale = (value: string): string =>
  normalizeCode(value).replaceAll("_", "-")

export const resolveVerifiedFacetPriceCurrency = (
  profileLocale: string,
  scope: FacetPriceCurrencyScope
): string | undefined => {
  const expectedCurrency = (
    FACET_PRICE_CURRENCY_BY_PROFILE_LOCALE as Readonly<Record<string, string>>
  )[normalizeLocale(profileLocale)]
  if (!expectedCurrency) {
    return
  }

  const scopedCurrencies = [
    scope.pricingContextCurrencyCode,
    scope.requestedCurrencyCode,
  ]
    .filter((currency): currency is string => typeof currency === "string")
    .map(normalizeCode)

  if (
    scopedCurrencies.length === 0 ||
    scopedCurrencies.some((currency) => currency !== expectedCurrency)
  ) {
    return
  }

  return expectedCurrency
}
