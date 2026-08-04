import type { HttpTypes } from "@medusajs/types"
import type {
  StorePricePerUnit,
  StoreProductVariantWithPricePerUnit,
} from "@techsio/storefront-data/products/types"

import { formatCurrencyAmount } from "./price-format"
import type { StorefrontPriceSource } from "./product-pricing"

type StorefrontPriceContext = {
  currencyCode: string
  source: StorefrontPriceSource
}

const normalizeCurrencyCode = (currencyCode?: string | null): string | null => {
  const normalizedCurrencyCode = currencyCode?.trim().toUpperCase()

  return normalizedCurrencyCode?.length === 3 ? normalizedCurrencyCode : null
}

const unitQuantityFormatter = new Intl.NumberFormat("sk-SK", {
  maximumFractionDigits: 6,
})

export const resolveVariantPricePerUnit = (
  variant:
    | HttpTypes.StoreProductVariant
    | StoreProductVariantWithPricePerUnit
    | null
    | undefined,
  priceContext: StorefrontPriceContext
): StorePricePerUnit | null => {
  if (priceContext.source !== "calculated_price") {
    return null
  }

  const variantWithPricePerUnit =
    variant as StoreProductVariantWithPricePerUnit | null
  const pricePerUnit =
    variantWithPricePerUnit?.calculated_price?.price_per_unit ?? null
  const displayedCurrencyCode = normalizeCurrencyCode(priceContext.currencyCode)
  const unitPriceCurrencyCode = normalizeCurrencyCode(
    pricePerUnit?.currency_code
  )

  return pricePerUnit &&
    displayedCurrencyCode &&
    unitPriceCurrencyCode === displayedCurrencyCode
    ? pricePerUnit
    : null
}

export const formatUnitPriceLabel = (
  pricePerUnit?: StorePricePerUnit | null
): string | null => {
  if (!pricePerUnit) {
    return null
  }

  const {
    calculated_amount: calculatedAmount,
    currency_code: currencyCode,
    product_unit_quantity: productUnitQuantity,
    unit_base_quantity: unitBaseQuantity,
    unit_symbol: unitSymbol,
  } = pricePerUnit
  const normalizedUnitSymbol = unitSymbol.trim()

  if (
    typeof calculatedAmount !== "number" ||
    !Number.isFinite(calculatedAmount) ||
    calculatedAmount < 0 ||
    typeof currencyCode !== "string" ||
    currencyCode.trim().length !== 3 ||
    !Number.isFinite(productUnitQuantity) ||
    productUnitQuantity <= 0 ||
    !Number.isFinite(unitBaseQuantity) ||
    unitBaseQuantity <= 0 ||
    !normalizedUnitSymbol
  ) {
    return null
  }

  return `${formatCurrencyAmount(calculatedAmount, currencyCode)} / ${unitQuantityFormatter.format(unitBaseQuantity)} ${normalizedUnitSymbol}`
}
