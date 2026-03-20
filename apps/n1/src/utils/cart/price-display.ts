import type { HttpTypes } from "@medusajs/types"

type TotalsLike = {
  original_item_subtotal?: number | null
  item_subtotal?: number | null
  subtotal?: number | null
  discount_total?: number | null
  shipping_total?: number | null
  item_tax_total?: number | null
  shipping_tax_total?: number | null
  tax_total?: number | null
  total?: number | null
}

export type TotalsDisplay = {
  subtotalLabel: "Cena bez DPH" | "Mezisoučet"
  subtotalAmount: number
  discountAmount: number
  shippingAmount: number
  taxAmount: number
  totalAmount: number
  showDiscount: boolean
  showShipping: boolean
  showTax: boolean
}

const resolveNumber = (value?: number | null) => value ?? 0

const resolveTaxAmount = (totals: TotalsLike) => {
  const cartTaxTotal = resolveNumber(totals.tax_total)
  if (cartTaxTotal > 0) {
    return cartTaxTotal
  }

  return (
    resolveNumber(totals.item_tax_total) + resolveNumber(totals.shipping_tax_total)
  )
}

const resolveSubtotalAmount = (totals: TotalsLike) => {
  if (totals.original_item_subtotal !== undefined && totals.original_item_subtotal !== null) {
    return totals.original_item_subtotal
  }

  if (totals.item_subtotal !== undefined && totals.item_subtotal !== null) {
    return totals.item_subtotal
  }

  return resolveNumber(totals.subtotal)
}

const createTotalsDisplay = (totals: TotalsLike): TotalsDisplay => {
  const taxAmount = resolveTaxAmount(totals)
  const discountAmount = resolveNumber(totals.discount_total)
  const shippingAmount = resolveNumber(totals.shipping_total)

  return {
    subtotalLabel: taxAmount > 0 ? "Cena bez DPH" : "Mezisoučet",
    subtotalAmount: resolveSubtotalAmount(totals),
    discountAmount,
    shippingAmount,
    taxAmount,
    totalAmount: resolveNumber(totals.total),
    showDiscount: discountAmount > 0,
    showShipping: shippingAmount > 0,
    showTax: taxAmount > 0,
  }
}

export const getCartTotalsDisplay = (cart: HttpTypes.StoreCart): TotalsDisplay =>
  createTotalsDisplay(cart)

export const getOrderTotalsDisplay = (
  order: HttpTypes.StoreOrder
): TotalsDisplay => createTotalsDisplay(order)

export const getCartLineItemUnitAmount = (
  item: Pick<
    HttpTypes.StoreCartLineItem,
    "unit_price" | "subtotal" | "total" | "quantity" | "tax_total" | "tax_lines"
  >
) => {
  const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1
  const lineTotal = resolveNumber(item.total)
  const lineTaxTotal = resolveNumber(item.tax_total)
  const taxRate =
    item.tax_lines?.reduce((sum, taxLine) => sum + (taxLine.rate ?? 0), 0) ?? 0

  if (lineTotal > 0 && lineTaxTotal > 0) {
    return lineTotal / quantity
  }

  if (item.unit_price !== undefined && item.unit_price !== null) {
    if (taxRate > 0) {
      return item.unit_price * (1 + taxRate * 0.01)
    }
    return item.unit_price
  }

  const lineAmount = item.total ?? item.subtotal ?? 0
  return lineAmount / quantity
}

export const getShippingOptionDisplay = (
  option: Pick<HttpTypes.StoreCartShippingOption, "amount" | "calculated_price">
) => ({
  amount: option.amount ?? option.calculated_price?.calculated_amount ?? 0,
  isTaxInclusive:
    option.calculated_price?.is_calculated_price_tax_inclusive === true,
})
