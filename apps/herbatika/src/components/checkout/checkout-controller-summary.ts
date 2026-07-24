import type { HttpTypes } from "@medusajs/types"

import {
  resolveCartItemsSubtotalAmount,
  resolveCartItemsTotalAmount,
  resolveCartShippingTotalAmount,
  resolveCartTaxAmount,
  resolveCartTotalAmount,
  resolveCartTotalWithoutTaxAmount,
} from "@/lib/storefront/cart-calculations"
import { resolveCartShippingSubtotalAmount } from "@/lib/storefront/cart-tax-calculations"

export const resolveCheckoutCartSummary = ({
  cart,
  selectedShippingMethodId,
  shippingPrices,
}: {
  cart: HttpTypes.StoreCart | null | undefined
  selectedShippingMethodId?: string | null
  shippingPrices: Record<string, number>
}) => {
  const selectedShippingOptionPrice = selectedShippingMethodId
    ? (shippingPrices[selectedShippingMethodId] ?? 0)
    : 0
  const hasCartShippingMethods = Boolean(cart?.shipping_methods?.length)

  return {
    cartItemsSubtotalAmount: resolveCartItemsSubtotalAmount(cart),
    cartItemsTotalAmount: resolveCartItemsTotalAmount(cart),
    cartShippingSubtotalAmount: hasCartShippingMethods
      ? resolveCartShippingSubtotalAmount(cart)
      : selectedShippingOptionPrice,
    cartShippingTotalAmount: hasCartShippingMethods
      ? resolveCartShippingTotalAmount(cart)
      : selectedShippingOptionPrice,
    cartTaxAmount: resolveCartTaxAmount(cart),
    cartTotalAmount: resolveCartTotalAmount(cart),
    cartTotalWithoutTaxAmount: resolveCartTotalWithoutTaxAmount(cart),
  }
}
