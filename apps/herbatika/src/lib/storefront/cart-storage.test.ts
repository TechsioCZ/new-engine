import { afterEach, describe, expect, it, vi } from "vitest"
import { buildCartCookie, cartStorage } from "./cart-storage"

describe("cart storage SSR cookie projection", () => {
  afterEach(() => {
    cartStorage.clear()
    vi.unstubAllGlobals()
  })

  it("encodes the cart id and scopes the cookie to storefront navigation", () => {
    expect(buildCartCookie("cart AbC/1", true)).toBe(
      "herbatika_cart_id=cart%20AbC%2F1; Path=/; SameSite=Lax; Max-Age=2592000; Secure"
    )
  })

  it("expires the mirrored cookie when the cart is cleared", () => {
    expect(buildCartCookie(null, false)).toBe(
      "herbatika_cart_id=; Path=/; SameSite=Lax; Max-Age=0"
    )
  })

  it("best-effort syncs a selected cart without exposing a session token", async () => {
    const values = new Map<string, string>()
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ cart_id: "cart_Case" }, { status: 200 })
      )
    vi.stubGlobal("fetch", fetcher)
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
      location: { protocol: "https:" },
    })
    vi.stubGlobal("document", { cookie: "" })

    expect(cartStorage.set("cart_Case")).toBeUndefined()

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith(
        "/api/storefront/checkout/cart-session",
        expect.objectContaining({ credentials: "include" })
      )
    })
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("cart_session")
  })
})
