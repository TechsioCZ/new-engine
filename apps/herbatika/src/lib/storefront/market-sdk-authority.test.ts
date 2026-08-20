import { describe, expect, it, vi } from "vitest"
import { createMarketRuntime } from "@/lib/market/market-runtime"
import { createMarketSdkAuthority } from "./market-sdk-authority"

const ENVIRONMENT = {
  ALLOWED_MARKETS: "sk,cz",
  MARKET_ACCEPTED_HOSTS_CZ: "herbatica.cz",
  MARKET_ACCEPTED_HOSTS_SK: "herbatica.sk",
  MARKET_PUBLISHABLE_KEY_CZ: "pk_cz_scoped",
  MARKET_PUBLISHABLE_KEY_SK: "pk_sk_scoped",
  MARKET_PUBLISHABLE_KEY_ID_CZ: "pkid_cz",
  MARKET_PUBLISHABLE_KEY_ID_SK: "pkid_sk",
  MARKET_REGION_CZ: "reg_cz",
  MARKET_REGION_SK: "reg_sk",
  MARKET_SALES_CHANNEL_CZ: "sc_cz",
  MARKET_SALES_CHANNEL_SK: "sc_sk",
} as const

describe("createMarketSdkAuthority", () => {
  it("creates and caches one SDK with the trusted key for each enabled market", () => {
    const createSdk = vi.fn((config) => ({ config }))
    const authority = createMarketSdkAuthority({
      baseUrl: "http://medusa.internal:9000",
      createSdk,
      runtime: createMarketRuntime(ENVIRONMENT),
    })

    const sk = authority("sk")
    const skAgain = authority("sk")
    const cz = authority("cz")

    expect(skAgain).toBe(sk)
    expect(sk.binding).toMatchObject({
      market: "sk",
      publishableApiKey: "pk_sk_scoped",
      regionId: "reg_sk",
      salesChannelId: "sc_sk",
    })
    expect(cz.binding).toMatchObject({
      market: "cz",
      publishableApiKey: "pk_cz_scoped",
      regionId: "reg_cz",
      salesChannelId: "sc_cz",
    })
    expect(createSdk).toHaveBeenNthCalledWith(1, {
      baseUrl: "http://medusa.internal:9000",
      publishableKey: "pk_sk_scoped",
    })
    expect(createSdk).toHaveBeenNthCalledWith(2, {
      baseUrl: "http://medusa.internal:9000",
      publishableKey: "pk_cz_scoped",
    })
  })

  it("fails closed instead of falling back to another market or a public key", () => {
    const createSdk = vi.fn()
    const authority = createMarketSdkAuthority({
      baseUrl: "http://medusa.internal:9000",
      createSdk,
      runtime: createMarketRuntime(ENVIRONMENT),
    })

    expect(() => authority("ro")).toThrow(
      "Market ro is not enabled by ALLOWED_MARKETS"
    )
    expect(createSdk).not.toHaveBeenCalled()
  })
})
