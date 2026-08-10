import type { HttpTypes } from "@medusajs/types"
import { isRecord } from "@techsio/std/object"

import {
  asFiniteNumber,
  hasExplicitlyNoLineItems,
  resolveLineItemSubtotalAmount,
  resolveLineItemTotalAmount,
} from "./cart-line-item-calculations"
import {
  resolveCartItemsTaxAmount,
  resolveCartShippingTaxAmount,
} from "./cart-tax-calculations"

export {
  asFiniteNumber,
  resolveCartItemName,
  resolveLineItemQuantity,
  resolveLineItemTotalAmount,
  resolveLineItemUnitAmount,
} from "./cart-line-item-calculations"

export const resolveCartTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0
  }

  if (hasExplicitlyNoLineItems(cart)) {
    return 0
  }

  const total = asFiniteNumber(cart.total)
  if (total !== null) {
    return total
  }

  const subtotal = asFiniteNumber(cart.subtotal)
  if (subtotal !== null) {
    return subtotal
  }

  return (
    cart.items?.reduce(
      (sum, item) => sum + resolveLineItemTotalAmount(item),
      0,
    ) ?? 0
  )
}

export const resolveCartItemsTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0
  }

  if (hasExplicitlyNoLineItems(cart)) {
    return 0
  }

  const cartRecord = isRecord(cart) ? cart : null
  const itemTotal = asFiniteNumber(cartRecord?.item_total)
  if (itemTotal !== null) {
    return itemTotal
  }

  return (
    cart.items?.reduce(
      (sum, item) => sum + resolveLineItemTotalAmount(item),
      0,
    ) ?? 0
  )
}

export const resolveCartItemsSubtotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0
  }

  if (hasExplicitlyNoLineItems(cart)) {
    return 0
  }

  const cartRecord = isRecord(cart) ? cart : null
  const itemSubtotal = asFiniteNumber(cartRecord?.item_subtotal)
  if (itemSubtotal !== null) {
    return itemSubtotal
  }

  return (
    cart.items?.reduce(
      (sum, item) => sum + resolveLineItemSubtotalAmount(item),
      0,
    ) ?? 0
  )
}

export const resolveCartShippingTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
  fallbackAmount = 0,
): number => asFiniteNumber(cart?.shipping_total) ?? fallbackAmount

export const resolveCartTaxAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0
  }

  if (hasExplicitlyNoLineItems(cart)) {
    return 0
  }

  const taxTotal = asFiniteNumber(cart.tax_total)
  if (taxTotal !== null) {
    return Math.max(taxTotal, 0)
  }

  const originalTaxTotal = asFiniteNumber(
    isRecord(cart) ? cart.original_tax_total : undefined,
  )
  if (originalTaxTotal !== null) {
    return Math.max(originalTaxTotal, 0)
  }

  const itemTaxTotal = resolveCartItemsTaxAmount(cart)
  const shippingTaxTotal = resolveCartShippingTaxAmount(cart)

  if (itemTaxTotal > 0 || shippingTaxTotal > 0) {
    return Math.max(itemTaxTotal + shippingTaxTotal, 0)
  }

  return 0
}

export const resolveCartTotalWithoutTaxAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0
  }

  if (hasExplicitlyNoLineItems(cart)) {
    return 0
  }

  const total = asFiniteNumber(cart.total)
  if (total !== null) {
    return Math.max(total - resolveCartTaxAmount(cart), 0)
  }

  const subtotal = asFiniteNumber(cart.subtotal)
  if (subtotal !== null) {
    return subtotal
  }

  const shippingSubtotal = asFiniteNumber(cart.shipping_subtotal) ?? 0
  return resolveCartItemsSubtotalAmount(cart) + shippingSubtotal
}
