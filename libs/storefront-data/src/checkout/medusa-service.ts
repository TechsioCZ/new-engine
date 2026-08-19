import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { CheckoutService } from "./types"

export type MedusaPaymentSessionDataInput = {
  cart: HttpTypes.StoreCart
  cartId: string
  providerId: string
}

export type MedusaPaymentSessionBindingInput = MedusaPaymentSessionDataInput & {
  paymentCollection: HttpTypes.StorePaymentCollection
  paymentSessionData: Record<string, unknown> | undefined
  paymentSessionId: string
}

type MaybePromise<T> = T | Promise<T>

export type MedusaCheckoutServiceConfig = {
  bindPaymentSessionData?: (
    input: MedusaPaymentSessionBindingInput
  ) => MaybePromise<void>
  cartFields?: string
  buildPaymentSessionData?: (
    input: MedusaPaymentSessionDataInput
  ) => MaybePromise<Record<string, unknown> | undefined>
}

const buildCartSelectParams = (
  fields?: string
): HttpTypes.SelectParams | undefined => {
  if (!fields) {
    return
  }

  return { fields }
}

const resolveInitiatedPaymentSessionId = (
  paymentCollection: HttpTypes.StorePaymentCollection,
  providerId: string
): string | undefined => {
  const providerSessions = paymentCollection.payment_sessions?.filter(
    (session) => session.provider_id === providerId
  )
  if (!providerSessions?.length) {
    return
  }

  const selectedSessions = providerSessions.filter(
    (session) => (session as { is_selected?: unknown }).is_selected === true
  )
  let paymentSession: (typeof providerSessions)[number] | undefined
  if (selectedSessions.length === 1) {
    paymentSession = selectedSessions[0]
  } else if (providerSessions.length === 1) {
    paymentSession = providerSessions[0]
  }

  return typeof paymentSession?.id === "string" && paymentSession.id
    ? paymentSession.id
    : undefined
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
export function createMedusaCheckoutService(
  sdk: Medusa,
  config?: MedusaCheckoutServiceConfig
): CheckoutService<
  HttpTypes.StoreCart,
  HttpTypes.StoreCartShippingOption,
  HttpTypes.StorePaymentProvider,
  HttpTypes.StorePaymentCollection,
  HttpTypes.StoreCompleteCartResponse
> {
  const cartQuery = buildCartSelectParams(config?.cartFields)

  return {
    async listShippingOptions(
      cartId: string,
      signal?: AbortSignal
    ): Promise<HttpTypes.StoreCartShippingOption[]> {
      const response =
        await sdk.client.fetch<HttpTypes.StoreShippingOptionListResponse>(
          "/store/shipping-options",
          {
            query: {
              cart_id: cartId,
            },
            signal,
          }
        )
      return response.shipping_options ?? []
    },

    async calculateShippingOption(
      optionId: string,
      input: { cart_id: string; data?: Record<string, unknown> },
      signal?: AbortSignal
    ): Promise<HttpTypes.StoreCartShippingOption> {
      const response =
        await sdk.client.fetch<HttpTypes.StoreShippingOptionResponse>(
          `/store/shipping-options/${optionId}/calculate`,
          {
            method: "POST",
            body: {
              cart_id: input.cart_id,
              data: input.data,
            },
            signal,
          }
        )
      return response.shipping_option
    },

    async addShippingMethod(
      cartId: string,
      optionId: string,
      data?: Record<string, unknown>
    ): Promise<HttpTypes.StoreCart> {
      const response = cartQuery
        ? await sdk.store.cart.addShippingMethod(
            cartId,
            {
              option_id: optionId,
              data,
            },
            cartQuery
          )
        : await sdk.store.cart.addShippingMethod(cartId, {
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
      signal?: AbortSignal
    ): Promise<HttpTypes.StorePaymentProvider[]> {
      const response =
        await sdk.client.fetch<HttpTypes.StorePaymentProviderListResponse>(
          "/store/payment-providers",
          {
            query: {
              region_id: regionId,
            },
            signal,
          }
        )
      return response.payment_providers ?? []
    },

    async initiatePaymentSession(
      cartId: string,
      providerId: string,
      cart?: HttpTypes.StoreCart | null
    ): Promise<HttpTypes.StorePaymentCollection> {
      const resolvedCart =
        cart ??
        (cartQuery
          ? (await sdk.store.cart.retrieve(cartId, cartQuery)).cart
          : (await sdk.store.cart.retrieve(cartId)).cart)
      if (!resolvedCart) {
        throw new Error("Failed to load cart for payment")
      }

      const paymentSessionData = await config?.buildPaymentSessionData?.({
        cart: resolvedCart,
        cartId,
        providerId,
      })

      const response = await sdk.store.payment.initiatePaymentSession(
        resolvedCart,
        {
          provider_id: providerId,
          ...(paymentSessionData ? { data: paymentSessionData } : {}),
        }
      )
      if (!response.payment_collection) {
        throw new Error("Failed to initiate payment session")
      }

      if (config?.bindPaymentSessionData) {
        const paymentSessionId = resolveInitiatedPaymentSessionId(
          response.payment_collection,
          providerId
        )
        if (!paymentSessionId) {
          throw new Error("Failed to resolve initiated payment session")
        }

        await config.bindPaymentSessionData({
          cart: resolvedCart,
          cartId,
          paymentCollection: response.payment_collection,
          paymentSessionData,
          paymentSessionId,
          providerId,
        })
      }

      return response.payment_collection
    },

    completeCart(cartId: string): Promise<HttpTypes.StoreCompleteCartResponse> {
      return sdk.store.cart.complete(cartId)
    },
  }
}
