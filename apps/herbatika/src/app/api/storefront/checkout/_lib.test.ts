import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: vi.fn((host: string) => {
    const markets = {
      "herbatica.cz": "cz",
      "herbatica.hu": "hu",
      "herbatica.ro": "ro",
      "herbatica.sk": "sk",
    } as const
    const market = markets[host as keyof typeof markets]
    return market
      ? {
          market,
          publishableApiKey: `pk_${market}`,
        }
      : null
  }),
}))

import { proxyCaughtFailure, proxyFailure } from "./_lib"

const requestFor = (host: string) =>
  new Request(`https://${host}/api/storefront/checkout/cart-session`, {
    headers: { host },
  })

describe("checkout API failure projection", () => {
  it.each([
    ["herbatica.sk", "Požiadavku v pokladni sa nepodarilo spracovať."],
    ["herbatica.cz", "Požadavek v pokladně se nepodařilo zpracovat."],
    ["herbatica.hu", "A pénztári kérést nem sikerült feldolgozni."],
    [
      "herbatica.ro",
      "Cererea de finalizare a comenzii nu a putut fi procesată.",
    ],
  ] as const)("localizes failures from %s", async (host, message) => {
    const response = proxyFailure(requestFor(host), 502)

    expect(response.status).toBe(502)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    await expect(response.json()).resolves.toEqual({ message })
  })

  it("never leaks caught internals", async () => {
    const response = proxyCaughtFailure(
      requestFor("herbatica.ro"),
      new Error("private upstream token")
    )

    expect(await response.text()).toBe(
      '{"message":"Cererea de finalizare a comenzii nu a putut fi procesată."}'
    )
  })

  it("keeps unknown Host failures generic", async () => {
    const response = proxyFailure(requestFor("unknown.example"), 400)

    expect(response.status).toBe(421)
    await expect(response.json()).resolves.toEqual({
      message: "Unknown storefront host.",
    })
  })
})
