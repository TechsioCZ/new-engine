import { afterEach, describe, expect, it, vi } from "vitest"
import { CART_SESSION_COOKIE_NAME } from "../_lib"
import { POST as bindPaymentReturn } from "./bind/route"
import { POST as issuePaymentReturn } from "./issue/route"

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: vi.fn((host: string) =>
    host === "herbatica.cz"
      ? {
          acceptedHosts: ["herbatica.cz"],
          canonicalOrigin: "https://herbatica.cz",
          countryCode: "CZ",
          locale: "cs-CZ",
          market: "cz",
          publishableApiKey: "pk_cz",
          publishableApiKeyId: "pak_cz",
          regionId: "reg_cz",
          salesChannelId: "sc_cz",
        }
      : null
  ),
}))

const request = (path: string, body: Record<string, string>) =>
  new Request(`https://herbatica.cz${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: `${CART_SESSION_COOKIE_NAME}=SignedCartSession`,
      host: "herbatica.cz",
    },
    method: "POST",
  })

describe("payment return bridges", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("issues an opaque state using only the signed cart authority", async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      Response.json(
        {
          cart_id: "cart_Case",
          expires_at: "2030-01-01T00:00:00.000Z",
          provider: "gopay",
          provider_id: "pp_gopay",
          state: "OpaqueState",
        },
        { status: 200 }
      )
    )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await issuePaymentReturn(
      request("/api/storefront/checkout/payment-return/issue", {
        cart_id: "cart_Case",
        provider_id: "pp_gopay",
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      cartId: "cart_Case",
      expiresAt: "2030-01-01T00:00:00.000Z",
      provider: "gopay",
      providerId: "pp_gopay",
      state: "OpaqueState",
    })
    const [, init] = upstreamFetch.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({
      "x-cart-session": "SignedCartSession",
    })
  })

  it("binds the exact selected payment session without echoing state", async () => {
    const state = "OpaqueState"
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            cart_id: "cart_Case",
            payment_session_id: "payses_Case",
            provider_id: "pp_gopay",
          },
          { status: 200 }
        )
      )
    )

    const response = await bindPaymentReturn(
      request("/api/storefront/checkout/payment-return/bind", {
        cart_id: "cart_Case",
        payment_session_id: "payses_Case",
        provider_id: "pp_gopay",
        state,
      })
    )

    expect(response.status).toBe(200)
    expect(await response.text()).not.toContain(state)
  })

  it("fails before Medusa when the signed authority is absent", async () => {
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await issuePaymentReturn(
      new Request(
        "https://herbatica.cz/api/storefront/checkout/payment-return/issue",
        {
          body: JSON.stringify({
            cart_id: "cart_Case",
            provider_id: "pp_gopay",
          }),
          headers: {
            "content-type": "application/json",
            host: "herbatica.cz",
          },
          method: "POST",
        }
      )
    )

    expect(response.status).toBe(404)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })
})
