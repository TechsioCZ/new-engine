import { describe, expect, it } from "vitest"
import {
  resolveMarketContext,
  resolveMarketRequestContext,
  resolveMarketRequestHost,
} from "./market-context"

const ROUTING_ENVIRONMENT = {
  ALLOWED_MARKETS: "sk,cz,hu,ro",
  MARKET_ACCEPTED_HOSTS_CZ:
    "herbatica.cz,www.herbatica.cz,test-engine-herbatika-cz-zane.web-revolution.cz",
  MARKET_ACCEPTED_HOSTS_HU:
    "herbatica.hu,www.herbatica.hu,test-engine-herbatika-hu-zane.web-revolution.cz",
  MARKET_ACCEPTED_HOSTS_RO:
    "herbatica.ro,www.herbatica.ro,test-engine-herbatika-ro-zane.web-revolution.cz",
  MARKET_ACCEPTED_HOSTS_SK:
    "herbatica.sk,www.herbatica.sk,test-engine-herbatika-zane.web-revolution.cz",
} as const

const HOST_MATRIX = [
  ["herbatica.sk", "sk", "sk", "sk-SK"],
  ["www.herbatica.sk", "sk", "sk", "sk-SK"],
  ["test-engine-herbatika-zane.web-revolution.cz", "sk", "sk", "sk-SK"],
  ["herbatica.cz", "cz", "cz", "cs-CZ"],
  ["www.herbatica.cz", "cz", "cz", "cs-CZ"],
  ["test-engine-herbatika-cz-zane.web-revolution.cz", "cz", "cz", "cs-CZ"],
  ["herbatica.hu", "hu", "hu", "hu-HU"],
  ["www.herbatica.hu", "hu", "hu", "hu-HU"],
  ["test-engine-herbatika-hu-zane.web-revolution.cz", "hu", "hu", "hu-HU"],
  ["herbatica.ro", "ro", "ro", "ro-RO"],
  ["www.herbatica.ro", "ro", "ro", "ro-RO"],
  ["test-engine-herbatika-ro-zane.web-revolution.cz", "ro", "ro", "ro-RO"],
] as const

describe("resolveMarketContext", () => {
  it.each(
    HOST_MATRIX
  )("resolves accepted host %s as the %s market", (host, code, countryCode, locale) => {
    expect(
      resolveMarketContext({ environment: ROUTING_ENVIRONMENT, host })
    ).toMatchObject({
      code,
      countryCode,
      domain: `herbatica.${code}`,
      locale,
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

  it("does not let a valid x-forwarded-host rescue an unknown public Host", () => {
    const host = resolveMarketRequestHost({
      forwardedHost: "herbatica.sk",
      host: "unknown.example",
    })

    expect(host).toBe("unknown.example")
    expect(
      resolveMarketRequestContext({
        environment: ROUTING_ENVIRONMENT,
        forwardedHost: "herbatica.sk",
        host,
      })
    ).toBeNull()
  })

  it("uses the trusted rewrite market when the rendered host is internal", () => {
    const markets = ["sk", "cz", "hu", "ro"].map((trustedMarket) =>
      resolveMarketRequestContext({
        environment: ROUTING_ENVIRONMENT,
        host: "zn-herbatika.internal",
        trustedCanonicalOrigin:
          trustedMarket === "sk"
            ? "https://herbatica.sk"
            : `https://herbatica.${trustedMarket}`,
        trustedMarket,
      })
    )

    expect(markets.map((market) => market?.code)).toEqual([
      "sk",
      "cz",
      "hu",
      "ro",
    ])
    expect(markets[3]).toMatchObject({
      currencyCode: "RON",
      locale: "ro-RO",
    })
  })

  it("rejects a partial or mismatched trusted rewrite context", () => {
    expect(
      resolveMarketRequestContext({
        environment: ROUTING_ENVIRONMENT,
        host: "herbatica.sk",
        trustedMarket: "ro",
      })
    ).toBeNull()
    expect(
      resolveMarketRequestContext({
        environment: ROUTING_ENVIRONMENT,
        host: "herbatica.sk",
        trustedCanonicalOrigin: "https://herbatica.sk",
        trustedMarket: "ro",
      })
    ).toBeNull()
  })
})
