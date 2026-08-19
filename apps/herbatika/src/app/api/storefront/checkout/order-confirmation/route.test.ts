import { afterEach, describe, expect, it, vi } from "vitest"
import { AUTH_SESSION_COOKIE_NAME } from "@/app/api/storefront-auth/_lib"
import { CART_SESSION_COOKIE_NAME } from "../_lib"
import { POST } from "./route"

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

describe("order confirmation bridge", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("forwards signed guest authority and returns exact-case one-time access", async () => {
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { order_token: "OrderToken", public_order_id: "order_Case" },
          { status: 200 }
        )
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await POST(
      new Request(
        "https://herbatica.cz/api/storefront/checkout/order-confirmation",
        {
          body: JSON.stringify({
            cart_id: "cart_Case",
            public_order_id: "order_Case",
          }),
          headers: {
            "content-type": "application/json",
            cookie: `${CART_SESSION_COOKIE_NAME}=SignedCartSession`,
            host: "herbatica.cz",
          },
          method: "POST",
        }
      )
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ot: "OrderToken",
      publicOrderId: "order_Case",
    })
    const [, init] = upstreamFetch.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({
      "x-cart-session": "SignedCartSession",
    })
    expect(JSON.parse(String(init.body))).toEqual({
      cart_id: "cart_Case",
      public_order_id: "order_Case",
    })
  })

  it("requires signed cart or registered customer authority", async () => {
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await POST(
      new Request(
        "https://herbatica.cz/api/storefront/checkout/order-confirmation",
        {
          body: JSON.stringify({
            cart_id: "cart_Case",
            public_order_id: "order_Case",
          }),
          headers: {
            "content-type": "application/json",
            cookie: "herbatika_cart_id=cart_Case",
            host: "herbatica.cz",
          },
          method: "POST",
        }
      )
    )

    expect(response.status).toBe(404)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it.each([
    `${CART_SESSION_COOKIE_NAME}=first; ${CART_SESSION_COOKIE_NAME}=second`,
    `${CART_SESSION_COOKIE_NAME}=%E0%A4%A`,
  ])("rejects ambiguous or malformed signed cart cookies", async (cookie) => {
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await POST(
      new Request(
        "https://herbatica.cz/api/storefront/checkout/order-confirmation",
        {
          body: JSON.stringify({
            cart_id: "cart_Case",
            public_order_id: "order_Case",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
            host: "herbatica.cz",
          },
          method: "POST",
        }
      )
    )

    expect(response.status).toBe(404)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it("forwards registered customer authority without exposing it", async () => {
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { order_token: "OrderToken", public_order_id: "order_Case" },
          { status: 200 }
        )
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await POST(
      new Request(
        "https://herbatica.cz/api/storefront/checkout/order-confirmation",
        {
          body: JSON.stringify({
            cart_id: "cart_Case",
            public_order_id: "order_Case",
          }),
          headers: {
            "content-type": "application/json",
            cookie: `${AUTH_SESSION_COOKIE_NAME}=CustomerToken`,
            host: "herbatica.cz",
          },
          method: "POST",
        }
      )
    )

    expect(response.status).toBe(200)
    const [, init] = upstreamFetch.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({
      authorization: "Bearer CustomerToken",
    })
    expect(await response.text()).not.toContain("CustomerToken")
  })

  it("does not leak an upstream token from a mismatched response", async () => {
    const secret = "WrongOrderToken"
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { order_token: secret, public_order_id: "ORDER_case" },
            { status: 200 }
          )
        )
    )

    const response = await POST(
      new Request(
        "https://herbatica.cz/api/storefront/checkout/order-confirmation",
        {
          body: JSON.stringify({
            cart_id: "cart_Case",
            public_order_id: "order_Case",
          }),
          headers: {
            "content-type": "application/json",
            cookie: `${CART_SESSION_COOKIE_NAME}=SignedCartSession`,
            host: "herbatica.cz",
          },
          method: "POST",
        }
      )
    )

    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain(secret)
  })
})
