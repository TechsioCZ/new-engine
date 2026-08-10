import {
  resolveCartItemsSubtotalAmount,
  resolveCartItemsTotalAmount,
  resolveCartShippingTotalAmount,
  resolveCartTaxAmount,
  resolveCartTotalAmount,
  resolveCartTotalWithoutTaxAmount,
} from "@/lib/storefront/cart-calculations"
import { resolveCartShippingSubtotalAmount } from "@/lib/storefront/cart-tax-calculations"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"

import { resolveHasStoredAddress } from "./checkout-address.utils"

const resolveSelectedShippingOptionPrice = (
  shippingPrices: unknown,
  selectedShippingMethodId: unknown,
) => {
  if (
    typeof selectedShippingMethodId !== "string" ||
    typeof shippingPrices !== "object" ||
    shippingPrices === null
  ) {
    return 0
  }
  const price: unknown = Reflect.get(shippingPrices, selectedShippingMethodId)
  return typeof price === "number" && Number.isFinite(price) ? price : 0
}

export const resolveCheckoutSummary = ({
  cart,
  effectiveSelectedPaymentProviderId,
  itemCount,
  pendingStates,
  regionCurrencyCode,
  selectedShippingMethodId,
  shippingPrices,
}: {
  cart: Parameters<typeof resolveCartTotalAmount>[0]
  effectiveSelectedPaymentProviderId: string | null | undefined
  itemCount: number
  pendingStates: readonly boolean[]
  regionCurrencyCode: string
  selectedShippingMethodId: unknown
  shippingPrices: unknown
}) => {
  const currencyCode = resolveSupportedCurrencyCode(
    cart?.currency_code,
    regionCurrencyCode,
  )
  const cartItems = cart?.items ?? []
  const hasItems = itemCount > 0 || cartItems.length > 0
  const hasStoredAddress = resolveHasStoredAddress(cart)
  const hasShipping =
    typeof selectedShippingMethodId === "string" &&
    selectedShippingMethodId.length > 0
  const hasPayment =
    typeof effectiveSelectedPaymentProviderId === "string" &&
    effectiveSelectedPaymentProviderId.length > 0
  const selectedShippingOptionPrice = resolveSelectedShippingOptionPrice(
    shippingPrices,
    selectedShippingMethodId,
  )
  const hasCartShippingMethods = (cart?.shipping_methods?.length ?? 0) > 0
  const cartItemsTotalAmount = resolveCartItemsTotalAmount(cart)
  const cartShippingTotalAmount = hasCartShippingMethods
    ? resolveCartShippingTotalAmount(cart)
    : selectedShippingOptionPrice
  const cartShippingSubtotalAmount = hasCartShippingMethods
    ? resolveCartShippingSubtotalAmount(cart)
    : selectedShippingOptionPrice
  const isBusy = pendingStates.some(Boolean)

  return {
    canCompleteOrder: !isBusy && hasShipping && hasPayment,
    cartItems,
    cartItemsSubtotalAmount: resolveCartItemsSubtotalAmount(cart),
    cartItemsTotalAmount,
    cartShippingSubtotalAmount,
    cartShippingTotalAmount,
    cartTaxAmount: resolveCartTaxAmount(cart),
    cartTotalAmount: resolveCartTotalAmount(cart),
    cartTotalWithoutTaxAmount: resolveCartTotalWithoutTaxAmount(cart),
    currencyCode,
    hasItems,
    hasPayment,
    hasShipping,
    hasStoredAddress,
    isBusy,
  }
}
