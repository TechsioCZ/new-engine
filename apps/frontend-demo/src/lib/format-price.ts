export function formatPrice(amount: number, currencyCode = "CZK"): string {
  // Convert from cents to currency units
  const price = amount

  return new Intl.NumberFormat("cs-CZ", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(price)
}
