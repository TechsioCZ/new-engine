import { formatPrice } from "@/lib/format-price"
import type { ReducedShippingMethod } from "@/types/checkout"

type ShippingPrice = ReducedShippingMethod["calculated_price"] | undefined

type PriceWithTax = {
  calculated_amount_with_tax?: number | null
}

type PriceTax = {
  calculated_tax?: number | null
}

type PriceTaxInclusive = {
  is_calculated_price_tax_inclusive?: boolean | null
}

const DEFAULT_TAX_RATE = 0.21

export function getShippingAmount(
  shippingMethod: ReducedShippingMethod | undefined,
  options?: {
    includeTax?: boolean
    fallbackTaxRate?: number
  }
): number {
  const includeTax = options?.includeTax ?? true
  const fallbackTaxRate = options?.fallbackTaxRate ?? DEFAULT_TAX_RATE
  const price = shippingMethod?.calculated_price as ShippingPrice

  if (!price) {
    return 0
  }

  const baseAmount = price.calculated_amount ?? 0
  const amountWithTax = (price as PriceWithTax).calculated_amount_with_tax
  const calculatedTax = (price as PriceTax).calculated_tax
  const isTaxInclusive = (price as PriceTaxInclusive)
    .is_calculated_price_tax_inclusive

  if (!includeTax) {
    return baseAmount
  }

  if (typeof amountWithTax === "number") {
    return amountWithTax
  }

  if (typeof calculatedTax === "number") {
    return baseAmount + calculatedTax
  }

  if (isTaxInclusive === false) {
    return baseAmount * (1 + fallbackTaxRate)
  }

  return baseAmount
}

export function formatShippingPrice(
  shippingMethod: ReducedShippingMethod | undefined,
  options?: {
    includeTax?: boolean
    fallbackTaxRate?: number
    fallbackCurrency?: string
  }
): string {
  const amount = getShippingAmount(shippingMethod, options)
  const currencyCode =
    shippingMethod?.calculated_price?.currency_code ??
    options?.fallbackCurrency ??
    "CZK"

  return formatPrice(amount, currencyCode)
}
