import { describe, expect, it } from "vitest"
import {
  resolveMarketContext,
  resolveMarketRequestContext,
  resolveMarketRequestHost,
} from "./market-context"

const ROUTING_ENVIRONMENT = {
  ALLOWED_MARKETS: "sk,ro",
  MARKET_ACCEPTED_HOSTS_RO: "ro.customer.example",
  MARKET_ACCEPTED_HOSTS_SK: "test.shop.example",
} as const

describe("resolveMarketContext", () => {
  it("resolves a configured deployment domain as the Slovak market", () => {
    expect(
      resolveMarketContext({
        environment: ROUTING_ENVIRONMENT,
        host: "test.shop.example",
      })
    ).toMatchObject({
      code: "sk",
      countryCode: "sk",
      domain: "test.shop.example",
      locale: "sk-SK",
    })
  })

  it("resolves another configured domain as the Romanian market", () => {
    expect(
      resolveMarketContext({
        environment: ROUTING_ENVIRONMENT,
        host: "ro.customer.example",
      })
    ).toMatchObject({
      code: "ro",
      countryCode: "ro",
      domain: "ro.customer.example",
      locale: "ro-RO",
    })
  })

  it("prefers the public Host header over a proxy forwarded host", () => {
    expect(
      resolveMarketRequestHost({
        forwardedHost: "zn-herbatika.internal",
        host: "test-engine-herbatika-ro-zane.web-revolution.cz",
      })
    ).toBe("test-engine-herbatika-ro-zane.web-revolution.cz")
  })

  it("uses the trusted rewrite market when the rendered host is internal", () => {
    const markets = ["sk", "ro", "sk", "ro"].map((trustedMarket) =>
      resolveMarketRequestContext({
        environment: ROUTING_ENVIRONMENT,
        host: "zn-herbatika.internal",
        trustedCanonicalOrigin:
          trustedMarket === "ro"
            ? "https://ro.customer.example"
            : "https://test.shop.example",
        trustedMarket,
      })
    )

    expect(markets.map((market) => market?.code)).toEqual([
      "sk",
      "ro",
      "sk",
      "ro",
    ])
    expect(markets[1]).toMatchObject({
      currencyCode: "RON",
      locale: "ro-RO",
    })
  })

  it("rejects a partial or mismatched trusted rewrite context", () => {
    expect(
      resolveMarketRequestContext({
        environment: ROUTING_ENVIRONMENT,
        host: "test.shop.example",
        trustedMarket: "ro",
      })
    ).toBeNull()
    expect(
      resolveMarketRequestContext({
        environment: ROUTING_ENVIRONMENT,
        host: "test.shop.example",
        trustedCanonicalOrigin: "https://test.shop.example",
        trustedMarket: "ro",
      })
    ).toBeNull()
  })
})
