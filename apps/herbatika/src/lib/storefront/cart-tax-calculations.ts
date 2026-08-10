import type { HttpTypes } from "@medusajs/types"
import { isRecord } from "@techsio/std/object"

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }

  return value
}

const hasExplicitlyNoLineItems = (cart: HttpTypes.StoreCart): boolean =>
  Array.isArray(cart.items) && cart.items.length === 0

export const resolveCartItemsTaxAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart || hasExplicitlyNoLineItems(cart)) {
    return 0
  }

  const itemTaxTotal = asFiniteNumber(
    isRecord(cart) ? cart.item_tax_total : undefined,
  )
  if (itemTaxTotal !== null) {
    return Math.max(itemTaxTotal, 0)
  }

  let taxAmount = 0
  for (const item of cart.items ?? []) {
    const itemRecord = isRecord(item) ? item : null
    taxAmount += asFiniteNumber(itemRecord?.tax_total) ?? 0
  }
  return taxAmount
}

export const resolveCartShippingTaxAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
): number => {
  if (!cart) {
    return 0
  }

  const shippingTaxTotal = asFiniteNumber(
    isRecord(cart) ? cart.shipping_tax_total : undefined,
  )
  if (shippingTaxTotal !== null) {
    return Math.max(shippingTaxTotal, 0)
  }

  let taxAmount = 0
  for (const shippingMethod of cart.shipping_methods ?? []) {
    const methodRecord = isRecord(shippingMethod) ? shippingMethod : null
    taxAmount += asFiniteNumber(methodRecord?.tax_total) ?? 0
  }
  return taxAmount
}

export const resolveCartShippingSubtotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
  fallbackAmount = 0,
): number => {
  const shippingSubtotal = asFiniteNumber(cart?.shipping_subtotal)
  if (shippingSubtotal !== null) {
    return Math.max(shippingSubtotal, 0)
  }

  const shippingTotal = asFiniteNumber(cart?.shipping_total)
  if (shippingTotal !== null) {
    return Math.max(shippingTotal - resolveCartShippingTaxAmount(cart), 0)
  }

  return fallbackAmount
}
