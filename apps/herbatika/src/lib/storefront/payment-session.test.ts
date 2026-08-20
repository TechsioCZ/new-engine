import type { HttpTypes } from "@medusajs/types"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  bindHerbatikaPaymentSessionData,
  buildHerbatikaPaymentReturnUrl,
  buildHerbatikaPaymentSessionData,
} from "./payment-session"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("buildHerbatikaPaymentReturnUrl", () => {
  it("builds the canonical technical callback and preserves opaque state", () => {
    const url = new URL(
      buildHerbatikaPaymentReturnUrl({
        access: {
          cartId: "cart/A+b?=1",
          expiresAt: "2026-08-19T03:00:00.000Z",
          provider: "gopay",
          providerId: "pp_gopay/AbC+42",
          state: "opaque/State+AbC==",
        },
        market: "hu",
      })
    )

    expect(`${url.origin}${url.pathname}`).toBe(
      "https://herbatica.hu/api/payments/gopay/return"
    )
    expect(url.searchParams.get("cart_id")).toBe("cart/A+b?=1")
    expect(url.searchParams.get("provider_id")).toBe("pp_gopay/AbC+42")
    expect(url.searchParams.get("state")).toBe("opaque/State+AbC==")
    expect([...url.searchParams.keys()].sort()).toEqual([
      "cart_id",
      "provider_id",
      "state",
    ])
  })

  it("binds provider family from the validated issue response", () => {
    const url = new URL(
      buildHerbatikaPaymentReturnUrl({
        access: {
          cartId: "cart_1",
          expiresAt: "2026-08-19T03:00:00.000Z",
          provider: "stripe",
          providerId: "pp_stripe",
          state: "opaque-state",
        },
        market: "ro",
      })
    )

    expect(`${url.origin}${url.pathname}`).toBe(
      "https://herbatica.ro/api/payments/stripe/return"
    )
  })

  it("issues state before building provider data without duplicating it in metadata", async () => {
    vi.stubGlobal("window", { location: { host: "www.herbatica.sk" } })
    const fetcher = vi.fn(async () =>
      Response.json({
        cartId: "cart_1",
        expiresAt: "2026-08-19T03:00:00.000Z",
        provider: "gopay",
        providerId: "pp_gopay",
        state: "opaque-state",
      })
    ) as unknown as typeof fetch
    vi.stubGlobal("fetch", fetcher)

    const data = await buildHerbatikaPaymentSessionData({
      cart: { id: "cart_1" } as HttpTypes.StoreCart,
      cartId: "cart_1",
      providerId: "pp_gopay",
    })

    expect(fetcher).toHaveBeenCalledOnce()
    expect(data.return_url).toBe(
      "https://herbatica.sk/api/payments/gopay/return?state=opaque-state&cart_id=cart_1&provider_id=pp_gopay"
    )
    expect(data.cancel_url).toBe(data.return_url)
    expect(data.success_url).toBe(data.return_url)
    expect(data.metadata).toEqual({
      cart_id: "cart_1",
      provider_id: "pp_gopay",
    })
    expect(data).not.toHaveProperty("payment_return_state")
  })

  it("binds only an exact callback URL and rejects extra or duplicate keys", async () => {
    vi.stubGlobal("window", { location: { host: "herbatica.sk" } })
    const fetcher = vi.fn(async () =>
      Response.json({
        cartId: "cart_1",
        paymentSessionId: "payses_1",
        providerId: "pp_gopay",
      })
    ) as unknown as typeof fetch
    vi.stubGlobal("fetch", fetcher)
    const baseInput = {
      cart: { id: "cart_1" } as HttpTypes.StoreCart,
      cartId: "cart_1",
      paymentCollection: {} as HttpTypes.StorePaymentCollection,
      paymentSessionId: "payses_1",
      providerId: "pp_gopay",
    }

    await bindHerbatikaPaymentSessionData({
      ...baseInput,
      paymentSessionData: {
        return_url:
          "https://herbatica.sk/api/payments/gopay/return?state=opaque-state&cart_id=cart_1&provider_id=pp_gopay",
      },
    })
    expect(fetcher).toHaveBeenCalledOnce()

    for (const returnUrl of [
      "https://herbatica.sk/api/payments/gopay/return?state=one&state=two&cart_id=cart_1&provider_id=pp_gopay",
      "https://herbatica.sk/api/payments/gopay/return?state=one&cart_id=cart_1&provider_id=pp_gopay&extra=value",
      "https://herbatica.ro/api/payments/gopay/return?state=one&cart_id=cart_1&provider_id=pp_gopay",
      "https://user@herbatica.sk/api/payments/gopay/return?state=one&cart_id=cart_1&provider_id=pp_gopay",
    ]) {
      await expect(
        bindHerbatikaPaymentSessionData({
          ...baseInput,
          paymentSessionData: { return_url: returnUrl },
        })
      ).rejects.toThrow("Payment return state was not prepared.")
    }
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
