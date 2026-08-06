import { describe, expect, it, vi } from "vitest"

vi.mock("@techsio/storefront-i18n/core/markets", () => ({
  defineStorefrontMarkets: (config: {
    defaultMarketCode: string
    hostMarketMap: Record<string, string>
    markets: Record<string, unknown>
  }) => ({
    defaultMarket: config.markets[config.defaultMarketCode],
    getMarket: (code: string) => config.markets[code],
    resolveMarket: ({ host }: { host?: string | null }) => {
      const code = host ? config.hostMarketMap[host] : undefined
      return code ? config.markets[code] : null
    },
  }),
}))

import { resolveMarketServerContext } from "./market-context.server"

const environment = {
  MARKET_SALES_CHANNEL_SK: "sc-sk",
  MARKET_SALES_CHANNEL_CZ: "sc-cz",
  MARKET_SALES_CHANNEL_HU: "sc-hu",
  MARKET_SALES_CHANNEL_RO: "sc-ro",
}

describe("resolveMarketServerContext", () => {
  it("accepts a trusted market only when it matches Host", () => {
    expect(
      resolveMarketServerContext({
        host: "herbatica.cz",
        trustedMarket: "cz",
        environment,
      })
    ).toMatchObject({ code: "cz", salesChannelId: "sc-cz" })
  })

  it("rejects a spoofed trusted market that conflicts with Host", () => {
    expect(() =>
      resolveMarketServerContext({
        host: "herbatica.sk",
        trustedMarket: "hu",
        environment,
      })
    ).toThrow("does not match")
  })

  it("rejects an unknown Host even when a trusted header is present", () => {
    expect(() =>
      resolveMarketServerContext({
        host: "attacker.example",
        trustedMarket: "sk",
        environment,
      })
    ).toThrow("Unknown storefront host")
  })
})
