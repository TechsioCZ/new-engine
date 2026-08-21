import { describe, expect, it, vi } from "vitest"
import {
  bindPaymentReturnAccess,
  buildOrderConfirmationHref,
  issueOrderConfirmationAccess,
  issuePaymentReturnAccess,
  syncCartSession,
} from "./checkout-access"

describe("checkout access client", () => {
  it("syncs the exact cart id with credentials included", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ cart_id: "cart_Case" }, { status: 200 })
      )

    await syncCartSession("cart_Case", fetcher)

    expect(fetcher).toHaveBeenCalledWith(
      "/api/storefront/checkout/cart-session",
      expect.objectContaining({
        body: JSON.stringify({ cart_id: "cart_Case" }),
        cache: "no-store",
        credentials: "include",
        method: "POST",
      })
    )
  })

  it("returns exact-case order access and builds a document URL", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ publicOrderId: "order_Case" }, { status: 200 })
      )

    const access = await issueOrderConfirmationAccess(
      { cartId: "cart_Case", publicOrderId: "order_Case" },
      fetcher
    )

    expect(access).toEqual({
      publicOrderId: "order_Case",
    })
    expect(fetcher).toHaveBeenCalledWith(
      "/api/storefront/checkout/order-confirmation",
      expect.objectContaining({
        body: JSON.stringify({
          cart_id: "cart_Case",
          public_order_id: "order_Case",
        }),
        credentials: "include",
      })
    )
    expect(
      buildOrderConfirmationHref({
        market: "cz",
        publicOrderId: access.publicOrderId,
      })
    ).toBe("/pokladna/potvrzeni-objednavky/order_Case")
  })

  it("fails closed without leaking a response token into the error", async () => {
    const secret = "NeverExposeThisToken"
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { ot: secret, publicOrderId: "ORDER_case" },
          { status: 200 }
        )
      )

    const request = issueOrderConfirmationAccess(
      { cartId: "cart_Case", publicOrderId: "order_Case" },
      fetcher
    )

    await expect(request).rejects.toThrow(
      "Checkout access response did not match the order."
    )
    await expect(request).rejects.not.toThrow(secret)
  })

  it("maps upstream failure to a token-free client error", async () => {
    const secret = "BackendSecretToken"
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ message: secret }, { status: 404 }))

    const request = syncCartSession("cart_Case", fetcher)
    await expect(request).rejects.toThrow("Checkout access request failed.")
    await expect(request).rejects.not.toThrow(secret)
  })

  it("issues and binds an exact payment-return state before redirect", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            canonicalOrigin: "https://shop.customer.example",
            cartId: "cart_Case",
            expiresAt: "2030-01-01T00:00:00.000Z",
            provider: "gopay",
            providerId: "pp_gopay",
            market: "sk",
            state: "OpaqueState",
          },
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            cartId: "cart_Case",
            paymentSessionId: "payses_Case",
            providerId: "pp_gopay",
          },
          { status: 200 }
        )
      )

    const access = await issuePaymentReturnAccess(
      { cartId: "cart_Case", providerId: "pp_gopay" },
      fetcher
    )
    await bindPaymentReturnAccess(
      {
        cartId: access.cartId,
        paymentSessionId: "payses_Case",
        providerId: access.providerId,
        state: access.state,
      },
      fetcher
    )

    expect(access.state).toBe("OpaqueState")
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "/api/storefront/checkout/payment-return/issue"
    )
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "/api/storefront/checkout/payment-return/bind"
    )
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      cart_id: "cart_Case",
      payment_session_id: "payses_Case",
      provider_id: "pp_gopay",
      state: "OpaqueState",
    })
  })

  it("rejects a mismatched payment binding without leaking state", async () => {
    const state = "NeverLeakPaymentState"
    const fetcher = vi.fn().mockResolvedValue(
      Response.json(
        {
          cartId: "cart_Case",
          paymentSessionId: "PAYSES_case",
          providerId: "pp_gopay",
        },
        { status: 200 }
      )
    )

    const request = bindPaymentReturnAccess(
      {
        cartId: "cart_Case",
        paymentSessionId: "payses_Case",
        providerId: "pp_gopay",
        state,
      },
      fetcher
    )
    await expect(request).rejects.toThrow(
      "Payment return binding did not match the payment session."
    )
    await expect(request).rejects.not.toThrow(state)
  })
})
