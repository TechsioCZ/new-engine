import type { StoreProduct } from "@medusajs/types"

import { CURRENCY_SYMBOL, DEFAULT_CURRENCY, TAX_RATE } from "@/lib/constants"

export const formatPrice = ({
  variants,
  tax = true,
}: {
  variants?: StoreProduct["variants"]
  tax?: boolean
}): string => {
  const variant = variants?.[0]
  const price = tax
    ? variant?.calculated_price?.calculated_amount_with_tax
    : variant?.calculated_price?.calculated_amount_without_tax
  const currency = variant?.calculated_price?.currency_code
  const currencyMap = currency === "czk" ? CURRENCY_SYMBOL : currency
  return price ? `${price.toFixed(0)} ${currencyMap}` : `0 ${CURRENCY_SYMBOL}`
}

/* when we need to format price for basic item regardless of the variants */
export const formatAmount = (
  amount?: number | null,
  useGrouping = true,
  currency = DEFAULT_CURRENCY
) => {
  if (!amount) {
    return `0 ${CURRENCY_SYMBOL}`
  }
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping,
  }).format(amount)
}

export const formatToTaxIncluded = ({
  amount,
  tax,
  currency,
}: {
  amount?: number
  tax?: number
  currency?: string
}) => {
  if (!amount) {
    return `0 ${CURRENCY_SYMBOL}`
  }
  const taxRate = tax || TAX_RATE
  const taxAmount = amount * taxRate
  const totalAmount = amount + taxAmount
  let currencyMap = CURRENCY_SYMBOL
  if (currency) {
    currencyMap = currency === "czk" ? CURRENCY_SYMBOL : currency
  }
  return `${Math.round(totalAmount)} ${currencyMap}`
}

export const formatVariants = (
  variants?: StoreProduct["variants"]
): string[] => {
  if (!variants || variants.length < 2) {
    return []
  }
  return variants.map((v) => v.title).filter((v): v is string => v !== null)
}
