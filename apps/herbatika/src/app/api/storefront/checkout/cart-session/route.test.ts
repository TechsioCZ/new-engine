import { afterEach, describe, expect, it, vi } from "vitest"
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

describe("cart session bridge", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("stores the signed session in an HttpOnly host cookie without echoing it", async () => {
    const secret = "signed.cart.session"
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { cart_id: "cart_Case", cart_session: secret },
          { status: 200 }
        )
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await POST(
      new Request("https://herbatica.cz/api/storefront/checkout/cart-session", {
        body: JSON.stringify({ cart_id: "cart_Case" }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.cz",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ cart_id: "cart_Case" })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("set-cookie")).toContain(
      `${CART_SESSION_COOKIE_NAME}=${secret}`
    )
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("set-cookie")).toContain("Secure")

    const [, init] = upstreamFetch.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ cart_id: "cart_Case" })
  })

  it("fails closed when upstream rejects the cart", async () => {
    const secret = "do-not-forward"
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ message: secret }, { status: 404 }))
    )

    const response = await POST(
      new Request("https://herbatica.cz/api/storefront/checkout/cart-session", {
        body: JSON.stringify({ cart_id: "cart_Case" }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.cz",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain(secret)
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("rejects an unknown host before contacting Medusa", async () => {
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await POST(
      new Request("https://unknown.test/api/storefront/checkout/cart-session", {
        body: JSON.stringify({ cart_id: "cart_Case" }),
        headers: {
          "content-type": "application/json",
          host: "unknown.test",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(421)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it("rejects extra body keys before contacting Medusa", async () => {
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await POST(
      new Request("https://herbatica.cz/api/storefront/checkout/cart-session", {
        body: JSON.stringify({ cart_id: "cart_Case", injected: "value" }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.cz",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })
})
