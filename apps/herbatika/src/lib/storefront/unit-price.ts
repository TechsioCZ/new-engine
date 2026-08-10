import { isRecord, getRecordValue } from "@techsio/std/object"
import type { StorePricePerUnit } from "@techsio/storefront-data/products/types"

import { formatCurrencyAmount } from "./price-format"
import type { StorefrontPriceSource } from "./product-pricing"

interface StorefrontPriceContext {
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

const isStorePricePerUnit = (value: unknown): value is StorePricePerUnit => {
  if (!isRecord(value)) {
    return false
  }
  if (
    getRecordValue(value, "calculated_amount") !== undefined &&
    typeof getRecordValue(value, "calculated_amount") !== "number"
  ) {
    return false
  }
  if (
    getRecordValue(value, "currency_code") !== null &&
    typeof getRecordValue(value, "currency_code") !== "string"
  ) {
    return false
  }

  const numericFields = [
    getRecordValue(value, "product_unit_quantity"),
    getRecordValue(value, "unit_base_quantity"),
  ]
  const stringFields = [
    getRecordValue(value, "unit_code"),
    getRecordValue(value, "unit_id"),
    getRecordValue(value, "unit_name"),
    getRecordValue(value, "unit_symbol"),
  ]
  return (
    numericFields.every((field) => typeof field === "number") &&
    stringFields.every((field) => typeof field === "string")
  )
}

export const resolveVariantPricePerUnit = (
  variant: unknown,
  priceContext: StorefrontPriceContext,
): StorePricePerUnit | null => {
  if (priceContext.source !== "calculated_price") {
    return null
  }

  const variantRecord = isRecord(variant) ? variant : null
  const calculatedPrice = getRecordValue(
    variantRecord ?? {},
    "calculated_price",
  )
  const pricePerUnitCandidate = isRecord(calculatedPrice)
    ? getRecordValue(calculatedPrice, "price_per_unit")
    : null
  const pricePerUnit = isStorePricePerUnit(pricePerUnitCandidate)
    ? pricePerUnitCandidate
    : null
  const displayedCurrencyCode = normalizeCurrencyCode(priceContext.currencyCode)
  const unitPriceCurrencyCode = normalizeCurrencyCode(
    pricePerUnit?.currency_code,
  )

  if (
    !pricePerUnit ||
    displayedCurrencyCode === null ||
    unitPriceCurrencyCode !== displayedCurrencyCode
  ) {
    return null
  }
  return pricePerUnit
}

export const formatUnitPriceLabel = (
  pricePerUnit?: StorePricePerUnit | null,
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
    calculatedAmount < 0
  ) {
    return null
  }
  if (typeof currencyCode !== "string" || currencyCode.trim().length !== 3) {
    return null
  }
  if (!Number.isFinite(productUnitQuantity) || productUnitQuantity <= 0) {
    return null
  }
  if (!Number.isFinite(unitBaseQuantity) || unitBaseQuantity <= 0) {
    return null
  }
  if (normalizedUnitSymbol.length === 0) {
    return null
  }

  return `${formatCurrencyAmount(calculatedAmount, currencyCode)} / ${unitQuantityFormatter.format(unitBaseQuantity)} ${normalizedUnitSymbol}`
}
