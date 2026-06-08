import type { HttpTypes } from "@medusajs/types"
import { vi } from "vitest"
import { createMedusaCheckoutService } from "../src/checkout/medusa-service"

type SdkLike = {
  store: {
    fulfillment: {
      listCartOptions: ReturnType<typeof vi.fn>
      calculate: ReturnType<typeof vi.fn>
    }
    cart: {
      addShippingMethod: ReturnType<typeof vi.fn>
      retrieve: ReturnType<typeof vi.fn>
      complete: ReturnType<typeof vi.fn>
    }
    payment: {
      listPaymentProviders: ReturnType<typeof vi.fn>
      initiatePaymentSession: ReturnType<typeof vi.fn>
    }
  }
}

function createSdkMock(overrides?: {
  retrieveCart?: () => Promise<{ cart?: HttpTypes.StoreCart | null }>
  initiatePaymentSession?: () => Promise<{
    payment_collection?: HttpTypes.StorePaymentCollection | null
  }>
}) {
  const sdk: SdkLike = {
    store: {
      fulfillment: {
        listCartOptions: vi.fn().mockResolvedValue({ shipping_options: [] }),
        calculate: vi
          .fn()
          .mockResolvedValue({ shipping_option: { id: "opt_1" } }),
      },
      cart: {
        addShippingMethod: vi
          .fn()
          .mockResolvedValue({ cart: { id: "cart_1" } }),
        retrieve: vi.fn().mockImplementation(
          overrides?.retrieveCart ??
            (() =>
              Promise.resolve({
                cart: { id: "cart_1" } as HttpTypes.StoreCart,
              }))
        ),
        complete: vi.fn().mockResolvedValue({ type: "order" }),
      },
      payment: {
        listPaymentProviders: vi
          .fn()
          .mockResolvedValue({ payment_providers: [] }),
        initiatePaymentSession: vi.fn().mockImplementation(
          overrides?.initiatePaymentSession ??
            (() =>
              Promise.resolve({
                payment_collection: {
                  id: "pay_col_1",
                } as HttpTypes.StorePaymentCollection,
              }))
        ),
      },
    },
  }

  return sdk
}

describe("createMedusaCheckoutService", () => {
  it("uses provided cart and skips cart.retrieve during payment session init", async () => {
    const sdk = createSdkMock()
    const service = createMedusaCheckoutService(sdk as never)

    const cart = { id: "cart_provided" } as HttpTypes.StoreCart

    await service.initiatePaymentSession("cart_provided", "pp_stripe", cart)

    expect(sdk.store.cart.retrieve).not.toHaveBeenCalled()
    expect(sdk.store.payment.initiatePaymentSession).toHaveBeenCalledWith(
      cart,
      {
        provider_id: "pp_stripe",
      }
    )
  })

  it("retrieves cart when cart is not provided", async () => {
    const sdk = createSdkMock()
    const service = createMedusaCheckoutService(sdk as never)

    await service.initiatePaymentSession("cart_fallback", "pp_default")

    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_fallback")
    expect(sdk.store.payment.initiatePaymentSession).toHaveBeenCalledWith(
      { id: "cart_1" },
      { provider_id: "pp_default" }
    )
  })

  it("awaits async payment session data before forwarding it to Medusa", async () => {
    const sdk = createSdkMock()
    const cart = { id: "cart_async" } as HttpTypes.StoreCart
    const service = createMedusaCheckoutService(sdk as never, {
      buildPaymentSessionData: async ({ cartId, providerId }) => ({
        cart_id: cartId,
        provider_id: providerId,
        source: "async-builder",
      }),
    })

    await service.initiatePaymentSession("cart_async", "pp_stripe", cart)

    expect(sdk.store.payment.initiatePaymentSession).toHaveBeenCalledWith(
      cart,
      {
        provider_id: "pp_stripe",
        data: {
          cart_id: "cart_async",
          provider_id: "pp_stripe",
          source: "async-builder",
        },
      }
    )
  })

  it("passes configured cart fields to cart-returning checkout calls", async () => {
    const sdk = createSdkMock()
    const fields = "id,total,subtotal,tax_total,shipping_subtotal"
    const query = { fields }
    const service = createMedusaCheckoutService(sdk as never, {
      cartFields: fields,
    })

    await service.addShippingMethod("cart_1", "so_1", { pickup_id: "box_1" })
    await service.initiatePaymentSession("cart_1", "pp_default")

    expect(sdk.store.cart.addShippingMethod).toHaveBeenCalledWith(
      "cart_1",
      {
        option_id: "so_1",
        data: { pickup_id: "box_1" },
      },
      query
    )
    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_1", query)
  })

  it("throws when cart cannot be resolved for payment initiation", async () => {
    const sdk = createSdkMock({
      retrieveCart: async () => ({ cart: null }),
    })
    const service = createMedusaCheckoutService(sdk as never)

    await expect(
      service.initiatePaymentSession("cart_missing", "pp_default")
    ).rejects.toThrow("Failed to load cart for payment")
  })

  it("throws when payment collection is missing in initiation response", async () => {
    const sdk = createSdkMock({
      initiatePaymentSession: async () => ({ payment_collection: null }),
    })
    const service = createMedusaCheckoutService(sdk as never)

    await expect(
      service.initiatePaymentSession("cart_1", "pp_default")
    ).rejects.toThrow("Failed to initiate payment session")
  })
})
