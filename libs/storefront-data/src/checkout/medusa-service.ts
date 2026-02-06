import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { CheckoutService } from "./types"

export type MedusaCheckoutServiceConfig = {
  // Reserved for future options
}

/**
 * Creates a CheckoutService for Medusa SDK
 *
 * @example
 * ```typescript
 * import { createCheckoutHooks, createMedusaCheckoutService } from "@techsio/storefront-data"
 * import { sdk } from "@/lib/medusa-client"
 *
 * const checkoutHooks = createCheckoutHooks({
 *   service: createMedusaCheckoutService(sdk),
 *   queryKeys: checkoutQueryKeys,
 * })
 * ```
 */
export function createMedusaCheckoutService(
  sdk: Medusa,
  _config?: MedusaCheckoutServiceConfig
): CheckoutService<
  HttpTypes.StoreCart,
  HttpTypes.StoreCartShippingOption,
  HttpTypes.StorePaymentProvider,
  HttpTypes.StorePaymentCollection,
  HttpTypes.StoreCompleteCartResponse
> {
  return {
    async listShippingOptions(
      cartId: string,
      _signal?: AbortSignal
    ): Promise<HttpTypes.StoreCartShippingOption[]> {
      const response = await sdk.store.fulfillment.listCartOptions({
        cart_id: cartId,
      })
      return response.shipping_options ?? []
    },

    async calculateShippingOption(
      optionId: string,
      input: { cart_id: string; data?: Record<string, unknown> },
      _signal?: AbortSignal
    ): Promise<HttpTypes.StoreCartShippingOption> {
      const response = await sdk.store.fulfillment.calculate(optionId, {
        cart_id: input.cart_id,
        data: input.data,
      })
      return response.shipping_option
    },

    async addShippingMethod(
      cartId: string,
      optionId: string,
      data?: Record<string, unknown>
    ): Promise<HttpTypes.StoreCart> {
      const response = await sdk.store.cart.addShippingMethod(cartId, {
        option_id: optionId,
        data,
      })
      if (!response.cart) {
        throw new Error("Failed to add shipping method")
      }
      return response.cart
    },

    async listPaymentProviders(
      regionId: string,
      _signal?: AbortSignal
    ): Promise<HttpTypes.StorePaymentProvider[]> {
      const response = await sdk.store.payment.listPaymentProviders({
        region_id: regionId,
      })
      return response.payment_providers ?? []
    },

    async initiatePaymentSession(
      cartId: string,
      providerId: string
    ): Promise<HttpTypes.StorePaymentCollection> {
      const { cart } = await sdk.store.cart.retrieve(cartId)
      if (!cart) {
        throw new Error("Failed to load cart for payment")
      }

      const response = await sdk.store.payment.initiatePaymentSession(cart, {
        provider_id: providerId,
      })
      if (!response.payment_collection) {
        throw new Error("Failed to initiate payment session")
      }
      return response.payment_collection
    },

    async completeCart(
      cartId: string
    ): Promise<HttpTypes.StoreCompleteCartResponse> {
      return sdk.store.cart.complete(cartId)
    },
  }
}
