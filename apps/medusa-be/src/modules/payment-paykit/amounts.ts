const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
])

const STRIPE_THREE_DECIMAL_CURRENCIES = new Set([
  "bhd",
  "iqd",
  "jod",
  "kwd",
  "omr",
  "tnd",
])

export const getCurrencyMultiplier = (
  currencyCode?: string,
  options: { includeStripeThreeDecimalCurrencies?: boolean } = {}
): number => {
  const normalizedCurrency = currencyCode?.toLowerCase() ?? ""

  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return 1
  }

  if (
    options.includeStripeThreeDecimalCurrencies &&
    STRIPE_THREE_DECIMAL_CURRENCIES.has(normalizedCurrency)
  ) {
    return 1000
  }

  return 100
}

export const toSmallestCurrencyUnit = (
  amount: number,
  currencyCode?: string
): number => Math.round(amount * getCurrencyMultiplier(currencyCode))

export const fromSmallestCurrencyUnit = (
  amount: number,
  currencyCode?: string,
  options: { includeStripeThreeDecimalCurrencies?: boolean } = {}
): number => amount / getCurrencyMultiplier(currencyCode, options)

export const toStripeSmallestCurrencyUnit = (
  amount: number,
  currencyCode?: string
): number => {
  const multiplier = getCurrencyMultiplier(currencyCode, {
    includeStripeThreeDecimalCurrencies: true,
  })
  const roundedMajor = Math.round(amount * multiplier) / multiplier
  const smallestUnitAmount = roundedMajor * multiplier

  return multiplier === 1000
    ? Math.ceil(smallestUnitAmount / 10) * 10
    : Math.trunc(smallestUnitAmount)
}
