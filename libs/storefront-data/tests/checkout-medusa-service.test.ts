import type { HttpTypes } from "@medusajs/types"
import type { Mock } from "vitest"
import { describe, expect, it, vi } from "vitest"

import { createMedusaCheckoutService } from "../src/checkout/medusa-service"
import {
  createStoreCart,
  createStorePaymentCollection,
  createTestMedusaSdk,
} from "./medusa-fixtures"

type CartResponse = Promise<{ cart?: HttpTypes.StoreCart | null }>
type PaymentCollectionResponse = Promise<{
  payment_collection?: HttpTypes.StorePaymentCollection | null
}>

interface SdkSpies {
  addShippingMethod: Mock<
    (
      cartId: string,
      body: HttpTypes.StoreAddCartShippingMethods,
      query?: HttpTypes.SelectParams,
    ) => CartResponse
  >
  initiatePaymentSession: Mock<
    (
      cart: HttpTypes.StoreCart,
      body: HttpTypes.StoreInitializePaymentSession,
      query?: HttpTypes.SelectParams,
    ) => PaymentCollectionResponse
  >
  retrieve: Mock<(id: string, query?: HttpTypes.SelectParams) => CartResponse>
}

const createSdkMock = (overrides?: {
  initiatePaymentSessionResult?: {
    payment_collection?: HttpTypes.StorePaymentCollection | null
  }
  retrieveResult?: { cart?: HttpTypes.StoreCart | null }
}) => {
  const sdk = createTestMedusaSdk()
  const spies: SdkSpies = {
    addShippingMethod:
      vi.fn<
        (
          cartId: string,
          body: HttpTypes.StoreAddCartShippingMethods,
          query?: HttpTypes.SelectParams,
        ) => CartResponse
      >(),
    initiatePaymentSession:
      vi.fn<
        (
          cart: HttpTypes.StoreCart,
          body: HttpTypes.StoreInitializePaymentSession,
          query?: HttpTypes.SelectParams,
        ) => PaymentCollectionResponse
      >(),
    retrieve:
      vi.fn<(id: string, query?: HttpTypes.SelectParams) => CartResponse>(),
  }

  spies.addShippingMethod.mockResolvedValue({
    cart: createStoreCart("cart_1"),
  })
  spies.retrieve.mockResolvedValue(
    overrides?.retrieveResult ?? { cart: createStoreCart("cart_1") },
  )
  spies.initiatePaymentSession.mockResolvedValue(
    overrides?.initiatePaymentSessionResult ?? {
      payment_collection: createStorePaymentCollection(),
    },
  )

  Object.defineProperties(sdk.store.cart, {
    addShippingMethod: { value: spies.addShippingMethod },
    retrieve: { value: spies.retrieve },
  })
  Object.defineProperty(sdk.store.payment, "initiatePaymentSession", {
    value: spies.initiatePaymentSession,
  })

  return { sdk, spies }
}

describe(createMedusaCheckoutService, () => {
  it("uses provided cart and skips cart.retrieve during payment session init", async () => {
    const { sdk, spies } = createSdkMock()
    const service = createMedusaCheckoutService(sdk)
    const cart = createStoreCart("cart_provided")

    await service.initiatePaymentSession("cart_provided", "pp_stripe", cart)

    expect(spies.retrieve).not.toHaveBeenCalled()
    expect(spies.initiatePaymentSession).toHaveBeenCalledWith(cart, {
      provider_id: "pp_stripe",
    })
  })

  it("retrieves cart when cart is not provided", async () => {
    const { sdk, spies } = createSdkMock()
    const service = createMedusaCheckoutService(sdk)

    await service.initiatePaymentSession("cart_fallback", "pp_default")

    expect(spies.retrieve).toHaveBeenCalledWith("cart_fallback")
    expect(spies.initiatePaymentSession).toHaveBeenCalledWith(
      createStoreCart("cart_1"),
      { provider_id: "pp_default" },
    )
  })

  it("awaits async payment session data before forwarding it to Medusa", async () => {
    const { sdk, spies } = createSdkMock()
    const cart = createStoreCart("cart_async")
    const service = createMedusaCheckoutService(sdk, {
      buildPaymentSessionData: ({ cartId, providerId }) => ({
        cart_id: cartId,
        provider_id: providerId,
        source: "async-builder",
      }),
    })

    await service.initiatePaymentSession("cart_async", "pp_stripe", cart)

    expect(spies.initiatePaymentSession).toHaveBeenCalledWith(cart, {
      data: {
        cart_id: "cart_async",
        provider_id: "pp_stripe",
        source: "async-builder",
      },
      provider_id: "pp_stripe",
    })
  })

  it("passes configured cart fields to cart-returning checkout calls", async () => {
    const { sdk, spies } = createSdkMock()
    const fields = "id,total,subtotal,tax_total,shipping_subtotal"
    const query = { fields }
    const service = createMedusaCheckoutService(sdk, {
      cartFields: fields,
    })

    await service.addShippingMethod("cart_1", "so_1", { pickup_id: "box_1" })
    await service.initiatePaymentSession("cart_1", "pp_default")

    expect(spies.addShippingMethod).toHaveBeenCalledWith(
      "cart_1",
      {
        data: { pickup_id: "box_1" },
        option_id: "so_1",
      },
      query,
    )
    expect(spies.retrieve).toHaveBeenCalledWith("cart_1", query)
  })

  it("rejects non-JSON shipping data before calling Medusa", async () => {
    const { sdk, spies } = createSdkMock()
    const service = createMedusaCheckoutService(sdk)

    await expect(
      service.addShippingMethod("cart_1", "so_1", {
        invalid: () => "not serializable",
      }),
    ).rejects.toThrow("Shipping method data must be a JSON object")
    expect(spies.addShippingMethod).not.toHaveBeenCalled()
  })

  it("rejects non-JSON payment data before calling Medusa", async () => {
    const { sdk, spies } = createSdkMock()
    const cart = createStoreCart("cart_invalid")
    const service = createMedusaCheckoutService(sdk, {
      buildPaymentSessionData: () => ({ invalid: Number.NaN }),
    })

    await expect(
      service.initiatePaymentSession("cart_invalid", "pp_stripe", cart),
    ).rejects.toThrow("Payment session data must be a JSON object")
    expect(spies.initiatePaymentSession).not.toHaveBeenCalled()
  })

  it("throws when cart cannot be resolved for payment initiation", async () => {
    const { sdk } = createSdkMock({ retrieveResult: { cart: null } })
    const service = createMedusaCheckoutService(sdk)

    await expect(
      service.initiatePaymentSession("cart_missing", "pp_default"),
    ).rejects.toThrow("Failed to load cart for payment")
  })

  it("throws when payment collection is missing in initiation response", async () => {
    const { sdk } = createSdkMock({
      initiatePaymentSessionResult: { payment_collection: null },
    })
    const service = createMedusaCheckoutService(sdk)

    await expect(
      service.initiatePaymentSession("cart_1", "pp_default"),
    ).rejects.toThrow("Failed to initiate payment session")
  })
})
