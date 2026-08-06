import { afterEach, describe, expect, it } from "vitest"
import {
  createMarketHostBindings,
  resolveAllowedMarkets,
  resolveMarketFromHost,
  resolveProxyRoute,
  scrubInternalHeaders,
} from "./proxy"

const originalAllowedMarkets = process.env.ALLOWED_MARKETS

afterEach(() => {
  process.env.ALLOWED_MARKETS = originalAllowedMarkets
})

describe("proxy static routing", () => {
  it("resolves only hosts in the runtime allowed market subset", () => {
    process.env.ALLOWED_MARKETS = "cz,hu"
    const bindings = createMarketHostBindings(process.env)

    expect(resolveMarketFromHost("HERBATICA.CZ:443", bindings)?.market).toBe(
      "cz"
    )
    expect(resolveMarketFromHost("herbatica.sk", bindings)).toBeNull()
    expect(resolveMarketFromHost("unknown.example", bindings)).toBeNull()
  })

  it("ignores invalid ALLOWED_MARKETS entries without falling back", () => {
    expect(resolveAllowedMarkets("xx,ro")).toEqual(new Set(["ro"]))
    expect(resolveAllowedMarkets("xx")).toEqual(new Set())
  })

  it("rewrites localized entity and flow segments", () => {
    expect(resolveProxyRoute("hu", "/TERMEKEK/ZOLD-TEA/")).toMatchObject({
      type: "entity",
      kind: "product",
      target: "/~sf/hu/product/ZOLD-TEA",
      normalizedPath: "/termekek/zold-tea",
    })
    expect(resolveProxyRoute("ro", "/cont/comenzi/Order-ABC")).toMatchObject({
      type: "flow",
      kind: "account",
      target: "/~sf/ro/account/order/Order-ABC",
      normalizedPath: "/cont/comenzi/Order-ABC",
    })
    expect(
      resolveProxyRoute("sk", "/recenzie/produkt/Token-AbC")
    ).toMatchObject({
      type: "flow",
      kind: "reviews",
      normalizedPath: "/recenzie/produkt/Token-AbC",
    })
  })

  it("blocks direct internal and unknown paths", () => {
    expect(resolveProxyRoute("sk", "/sk/product/example")).toEqual({
      type: "not-found",
    })
    expect(resolveProxyRoute("sk", "/not-a-route")).toEqual({
      type: "not-found",
    })
  })

  it("scrubs spoofable internal request headers", () => {
    const headers = new Headers({
      accept: "text/html",
      "x-canonical-origin": "https://evil.example",
      "x-market-code": "sk",
      "x-sales-channel-id": "sc_evil",
      "x-sf-market": "sk",
      "x-sf-custom": "evil",
    })

    const scrubbed = scrubInternalHeaders(headers)
    expect(Object.fromEntries(scrubbed)).toEqual({ accept: "text/html" })
  })
})
