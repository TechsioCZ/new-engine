import type { HttpTypes } from "@medusajs/types"
import { createCheckoutHooks } from "@techsio/storefront-data/checkout/hooks"
import { createMedusaCheckoutService } from "@techsio/storefront-data/checkout/medusa-service"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import { cartQueryKeys } from "./cart-query-keys"

const checkoutQueryKeys = {
  all: () => queryKeys.checkout.all(),
  shippingOptions: (cartId: string, cacheKey?: string) =>
    queryKeys.checkout.shippingOptions(cartId, cacheKey),
  shippingOptionPrice: (params: {
    cartId: string
    optionId: string
    data?: Record<string, unknown>
  }) => queryKeys.checkout.shippingOptionPrice(params),
  paymentProviders: (regionId: string) =>
    queryKeys.checkout.paymentProviders(regionId),
}

export const checkoutHooks = createCheckoutHooks<
  HttpTypes.StoreCart,
  HttpTypes.StoreCartShippingOption,
  HttpTypes.StorePaymentProvider,
  HttpTypes.StorePaymentCollection,
  HttpTypes.StoreCompleteCartResponse
>({
  service: createMedusaCheckoutService(sdk),
  queryKeys: checkoutQueryKeys,
  queryKeyNamespace: "n1",
  cartQueryKeys,
})
