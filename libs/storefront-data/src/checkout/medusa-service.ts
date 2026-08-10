import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

import { decodeStorefrontMetadata } from "../shared/metadata"
import type { StorefrontMetadata } from "../shared/metadata"
import type { CheckoutService } from "./types"

export interface MedusaPaymentSessionDataInput {
  cart: HttpTypes.StoreCart
  cartId: string
  providerId: string
}

type MaybePromise<T> = T | Promise<T>

export interface MedusaCheckoutServiceConfig<
  TPaymentSessionData extends object = StorefrontMetadata,
> {
  cartFields?: string
  buildPaymentSessionData?: (
    input: MedusaPaymentSessionDataInput,
  ) => MaybePromise<TPaymentSessionData | undefined>
}

const buildAddShippingMethodBody = (
  optionId: string,
  data?: unknown,
): HttpTypes.StoreAddCartShippingMethods =>
  data === undefined
    ? { option_id: optionId }
    : {
        data: decodeStorefrontMetadata(data, "Shipping method data"),
        option_id: optionId,
      }

const buildInitializePaymentSessionBody = (
  providerId: string,
  data?: unknown,
): HttpTypes.StoreInitializePaymentSession =>
  data === undefined
    ? { provider_id: providerId }
    : {
        data: decodeStorefrontMetadata(data, "Payment session data"),
        provider_id: providerId,
      }

const buildCartSelectParams = (
  fields?: string,
): HttpTypes.SelectParams | undefined => {
  if (fields === undefined || fields.length === 0) {
    return undefined
  }

  return { fields }
}

/**
 * Creates a CheckoutService for Medusa SDK
 *
 * @example
 * ```typescript
 * import { createCheckoutHooks } from "@techsio/storefront-data/checkout/hooks"
 * import { createMedusaCheckoutService } from "@techsio/storefront-data/checkout/medusa-service"
 * import { sdk } from "@/lib/medusa-client"
 *
 * const checkoutHooks = createCheckoutHooks({
 *   service: createMedusaCheckoutService(sdk),
 *   queryKeys: checkoutQueryKeys,
 * })
 * ```
 */
export type MedusaCheckoutService = Required<
  CheckoutService<
    HttpTypes.StoreCart,
    HttpTypes.StoreCartShippingOption,
    HttpTypes.StorePaymentProvider,
    HttpTypes.StorePaymentCollection,
    HttpTypes.StoreCompleteCartResponse
  >
>

export const createMedusaCheckoutService = <
  TPaymentSessionData extends object = StorefrontMetadata,
>(
  sdk: Medusa,
  config?: MedusaCheckoutServiceConfig<TPaymentSessionData>,
): MedusaCheckoutService => {
  const cartQuery = buildCartSelectParams(config?.cartFields)

  return {
    async addShippingMethod(
      cartId: string,
      optionId: string,
      data?: object,
    ): Promise<HttpTypes.StoreCart> {
      const response = cartQuery
        ? await sdk.store.cart.addShippingMethod(
            cartId,
            buildAddShippingMethodBody(optionId, data),
            cartQuery,
          )
        : await sdk.store.cart.addShippingMethod(
            cartId,
            buildAddShippingMethodBody(optionId, data),
          )
      if (typeof response.cart !== "object" || response.cart === null) {
        throw new Error("Failed to add shipping method")
      }
      return response.cart
    },

    async calculateShippingOption(
      optionId: string,
      input: { cart_id: string; data?: object },
      signal?: AbortSignal,
    ): Promise<HttpTypes.StoreCartShippingOption> {
      const response =
        await sdk.client.fetch<HttpTypes.StoreShippingOptionResponse>(
          `/store/shipping-options/${optionId}/calculate`,
          {
            body: {
              cart_id: input.cart_id,
              data: input.data,
            },
            method: "POST",
            signal: signal ?? null,
          },
        )
      return response.shipping_option
    },

    async completeCart(
      cartId: string,
    ): Promise<HttpTypes.StoreCompleteCartResponse> {
      return await sdk.store.cart.complete(cartId)
    },

    async initiatePaymentSession(
      cartId: string,
      providerId: string,
      cart?: HttpTypes.StoreCart | null,
    ): Promise<HttpTypes.StorePaymentCollection> {
      let resolvedCart = cart
      if (resolvedCart === undefined || resolvedCart === null) {
        const retrievedCartResponse = cartQuery
          ? await sdk.store.cart.retrieve(cartId, cartQuery)
          : await sdk.store.cart.retrieve(cartId)
        resolvedCart = retrievedCartResponse.cart
      }
      if (resolvedCart === undefined || resolvedCart === null) {
        throw new Error("Failed to load cart for payment")
      }

      const paymentSessionData = await config?.buildPaymentSessionData?.({
        cart: resolvedCart,
        cartId,
        providerId,
      })

      const response = await sdk.store.payment.initiatePaymentSession(
        resolvedCart,
        buildInitializePaymentSessionBody(providerId, paymentSessionData),
      )
      if (
        typeof response.payment_collection !== "object" ||
        response.payment_collection === null
      ) {
        throw new Error("Failed to initiate payment session")
      }
      return response.payment_collection
    },

    async listPaymentProviders(
      regionId: string,
      signal?: AbortSignal,
    ): Promise<HttpTypes.StorePaymentProvider[]> {
      const response =
        await sdk.client.fetch<HttpTypes.StorePaymentProviderListResponse>(
          "/store/payment-providers",
          {
            query: {
              region_id: regionId,
            },
            signal: signal ?? null,
          },
        )
      return response.payment_providers ?? []
    },

    async listShippingOptions(
      cartId: string,
      signal?: AbortSignal,
    ): Promise<HttpTypes.StoreCartShippingOption[]> {
      const response =
        await sdk.client.fetch<HttpTypes.StoreShippingOptionListResponse>(
          "/store/shipping-options",
          {
            query: {
              cart_id: cartId,
            },
            signal: signal ?? null,
          },
        )
      return response.shipping_options ?? []
    },
  }
}
