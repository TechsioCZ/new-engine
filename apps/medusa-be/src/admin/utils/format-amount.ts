export const formatAmount = (amount: number, currencyCode: string) =>
  new Intl.NumberFormat("en-US", {
    currency: currencyCode,
    style: "currency",
  }).format(amount)
