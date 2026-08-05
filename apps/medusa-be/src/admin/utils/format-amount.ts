export const formatAmount = (amount: number, currency_code: string) =>
  new Intl.NumberFormat("en-US", {
    currency: currency_code,
    style: "currency",
  }).format(amount)
