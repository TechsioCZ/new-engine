"use client"

import { createCheckoutHooks } from "@techsio/storefront-data/checkout/hooks"
import { createMedusaCheckoutService } from "@techsio/storefront-data/checkout/medusa-service"
import type { CartQueryKeys } from "@techsio/storefront-data/cart/types"
import type { CheckoutQueryKeys } from "@techsio/storefront-data/checkout/types"
import { queryKeys } from "@/lib/query-keys"
import { sdk } from "@/lib/medusa-client"

const checkoutQueryKeys: CheckoutQueryKeys = {
  all: () => [...queryKeys.all, "checkout"] as const,
  shippingOptions: (cartId: string, cacheKey?: string) => {
    const baseKey = queryKeys.fulfillment.cartOptions(cartId)
    return cacheKey ? ([...baseKey, cacheKey] as const) : baseKey
  },
  shippingOptionPrice: ({ cartId, optionId, data }) =>
    [
      ...queryKeys.fulfillment.cartOptions(cartId),
      "price",
      optionId,
      data ?? {},
    ] as const,
  paymentProviders: (regionId: string) =>
    [...queryKeys.all, "checkout", "payment-providers", regionId] as const,
}

const cartQueryKeys: CartQueryKeys = {
  all: () => queryKeys.cartKeys.all(),
  active: ({ cartId }) => queryKeys.cartKeys.active({ cartId }),
  detail: (cartId: string) => queryKeys.cartKeys.detail(cartId),
}

const checkoutHooks = createCheckoutHooks({
  service: createMedusaCheckoutService(sdk),
  queryKeys: checkoutQueryKeys,
  cartQueryKeys,
})

export const {
  useCheckoutShipping: useStorefrontCheckoutShipping,
  useCheckoutPayment: useStorefrontCheckoutPayment,
} = checkoutHooks
