import type { HttpTypes } from "@medusajs/types"
import {
  resolveCartItemsTaxAmount,
  resolveCartShippingTaxAmount,
} from "./cart-tax-calculations"

export const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }

  return value
}

const hasExplicitlyNoLineItems = (cart: HttpTypes.StoreCart): boolean =>
  Array.isArray(cart.items) && cart.items.length === 0

export const resolveLineItemQuantity = (
  item: HttpTypes.StoreCartLineItem
): number => Math.max(1, asFiniteNumber(item.quantity) ?? 1)

export const resolveLineItemTotalAmount = (
  item: HttpTypes.StoreCartLineItem
): number => {
  const total = asFiniteNumber(item.total)
  if (total !== null) {
    return total
  }

  const subtotal = asFiniteNumber(item.subtotal)
  if (subtotal !== null) {
    return subtotal
  }

  const unitPrice = asFiniteNumber(item.unit_price) ?? 0
  return unitPrice * resolveLineItemQuantity(item)
}

export const resolveLineItemSubtotalAmount = (
  item: HttpTypes.StoreCartLineItem
): number => asFiniteNumber(item.subtotal) ?? resolveLineItemTotalAmount(item)

export const resolveLineItemUnitAmount = (
  item: HttpTypes.StoreCartLineItem
): number => {
  const unitPrice = asFiniteNumber(item.unit_price)
  if (unitPrice !== null) {
    return unitPrice
  }

  const quantity = resolveLineItemQuantity(item)
  if (quantity <= 0) {
    return resolveLineItemTotalAmount(item)
  }

  return resolveLineItemTotalAmount(item) / quantity
}

export const resolveCartTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined
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
      0
    ) ?? 0
  )
}

export const resolveCartItemsTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined
): number => {
  if (!cart) {
    return 0
  }

  if (hasExplicitlyNoLineItems(cart)) {
    return 0
  }

  const cartRecord = cart as unknown as Record<string, unknown>
  const itemTotal = asFiniteNumber(cartRecord.item_total)
  if (itemTotal !== null) {
    return itemTotal
  }

  return (
    cart.items?.reduce(
      (sum, item) => sum + resolveLineItemTotalAmount(item),
      0
    ) ?? 0
  )
}

export const resolveCartItemsSubtotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined
): number => {
  if (!cart) {
    return 0
  }

  if (hasExplicitlyNoLineItems(cart)) {
    return 0
  }

  const cartRecord = cart as unknown as Record<string, unknown>
  const itemSubtotal = asFiniteNumber(cartRecord.item_subtotal)
  if (itemSubtotal !== null) {
    return itemSubtotal
  }

  return (
    cart.items?.reduce(
      (sum, item) => sum + resolveLineItemSubtotalAmount(item),
      0
    ) ?? 0
  )
}

export const resolveCartShippingTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
  fallbackAmount = 0
): number => asFiniteNumber(cart?.shipping_total) ?? fallbackAmount

export const resolveCartTaxAmount = (
  cart: HttpTypes.StoreCart | null | undefined
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
    (cart as unknown as Record<string, unknown>).original_tax_total
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
  cart: HttpTypes.StoreCart | null | undefined
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

export const resolveCartItemName = (item: HttpTypes.StoreCartLineItem) =>
  item.title ?? item.product_title ?? item.variant_title ?? item.id
