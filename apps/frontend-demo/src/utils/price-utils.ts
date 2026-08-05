/**
 * Currency symbol mapping
 */
const currencySymbols: Record<string, string> = {
  CZK: "Kč",
  DKK: "kr",
  EUR: "€",
  GBP: "£",
  NOK: "kr",
  PLN: "zł",
  SEK: "kr",
  USD: "$",
}

/**
 * Format price with currency
 * @param amount - Price amount in major units (dollars/euros, not cents)
 * @param currencyCode - ISO currency code (e.g., 'EUR', 'USD')
 * @returns Formatted price string
 */
export function formatPrice(amount: number, currencyCode = "CZK"): string {
  const symbol = currencySymbols[currencyCode.toUpperCase()] || currencyCode

  // For currencies that typically place symbol after (Nordic, Czech, Polish)
  if (
    ["SEK", "DKK", "NOK", "PLN", "CZK"].includes(currencyCode.toUpperCase())
  ) {
    return `${amount.toFixed(0)} ${symbol}`
  }

  // Default: symbol before amount
  return `${symbol}${amount.toFixed(2)}`
}
