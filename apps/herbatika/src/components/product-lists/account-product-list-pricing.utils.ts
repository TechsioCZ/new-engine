import type { HttpTypes } from "@medusajs/types"

import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import type { StoreProductListItem } from "@/lib/storefront/product-lists"
import {
  asStorefrontNumber,
  asStorefrontRecord,
  resolveAmountWithoutTax,
  resolveProductTopOffer,
  resolveStorefrontPrice,
} from "@/lib/storefront/product-pricing"

import {
  resolveProductListItemProduct,
  resolveProductListItemQuantity,
  resolveProductListItemVariant,
} from "./account-product-list-product.utils"

const UNAVAILABLE_PRICE_LABEL = "Nie je dostupné"

export type ProductListPriceSummary = {
  totalWithTaxLabel: string
  totalWithoutTaxLabel: string
}

const resolveProductListItemPrice = (params: {
  currencyCode: string
  item: StoreProductListItem
  product: HttpTypes.StoreProduct
}) => {
  const { currencyCode, item, product } = params
  const variant = resolveProductListItemVariant(item, product)
  const calculatedPrice = asStorefrontRecord(variant?.calculated_price)
  const topOffer = resolveProductTopOffer(product)
  const price = resolveStorefrontPrice({
    calculatedAmount: calculatedPrice?.["calculated_amount"],
    calculatedCurrencyCode: calculatedPrice?.["currency_code"],
    calculatedOriginalAmount: calculatedPrice?.["original_amount"],
    expectedCurrencyCode: currencyCode,
    topOffer,
  })

  if (!price) {
    return null
  }

  const variantMetadata = asStorefrontRecord(variant?.metadata)
  const calculatedAmountWithoutTax =
    price.source === "calculated_price"
      ? asStorefrontNumber(calculatedPrice?.["calculated_amount_without_tax"])
      : null
  const amountWithoutTax = resolveAmountWithoutTax({
    amountWithTax: price.currentAmount,
    amountWithoutTax: calculatedAmountWithoutTax,
    vatRate:
      asStorefrontNumber(variantMetadata?.["vat"]) ??
      asStorefrontNumber(topOffer?.["vat"]),
  })

  return { amountWithTax: price.currentAmount, amountWithoutTax }
}

export const resolveProductListPriceSummary = (params: {
  currencyCode?: string | null
  items: StoreProductListItem[]
  productsById: Map<string, HttpTypes.StoreProduct>
}): ProductListPriceSummary => {
  const currencyCode = resolveSupportedCurrencyCode(params.currencyCode)
  let totalWithTaxAmount = 0
  let totalWithoutTaxAmount = 0
  let hasPricedItems = false
  let hasMissingPrice = false
  let hasMissingAmountWithoutTax = false

  for (const item of params.items) {
    const product = resolveProductListItemProduct(item, params.productsById)
    if (!product) {
      hasMissingPrice = true
      hasMissingAmountWithoutTax = true
      continue
    }

    const price = resolveProductListItemPrice({ currencyCode, item, product })
    if (!price) {
      hasMissingPrice = true
      hasMissingAmountWithoutTax = true
      continue
    }

    const quantity = resolveProductListItemQuantity(item)
    hasPricedItems = true
    totalWithTaxAmount += price.amountWithTax * quantity

    if (typeof price.amountWithoutTax === "number") {
      totalWithoutTaxAmount += price.amountWithoutTax * quantity
    } else {
      hasMissingAmountWithoutTax = true
    }
  }

  const totalWithTax =
    hasPricedItems && !hasMissingPrice ? totalWithTaxAmount : null
  const totalWithoutTax =
    hasPricedItems && !hasMissingPrice && !hasMissingAmountWithoutTax
      ? totalWithoutTaxAmount
      : null

  return {
    totalWithTaxLabel:
      typeof totalWithTax === "number"
        ? formatCurrencyAmount(totalWithTax, currencyCode)
        : UNAVAILABLE_PRICE_LABEL,
    totalWithoutTaxLabel:
      typeof totalWithoutTax === "number"
        ? formatCurrencyAmount(totalWithoutTax, currencyCode)
        : UNAVAILABLE_PRICE_LABEL,
  }
}
