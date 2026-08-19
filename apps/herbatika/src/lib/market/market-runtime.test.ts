import { describe, expect, it } from "vitest"
import {
  createMarketRuntime,
  getMarketRuntime,
  resolveMarketRuntimeByHost,
} from "./market-runtime"

const COMPLETE_ENVIRONMENT = {
  ALLOWED_MARKETS: "sk,cz,hu,ro",
  MARKET_ACCEPTED_HOSTS_CZ: "herbatica.cz",
  MARKET_ACCEPTED_HOSTS_HU: "herbatica.hu",
  MARKET_ACCEPTED_HOSTS_RO: "herbatica.ro",
  MARKET_ACCEPTED_HOSTS_SK: "herbatica.sk",
  MARKET_PUBLISHABLE_KEY_CZ: "pk_cz",
  MARKET_PUBLISHABLE_KEY_HU: "pk_hu",
  MARKET_PUBLISHABLE_KEY_RO: "pk_ro",
  MARKET_PUBLISHABLE_KEY_SK: "pk_sk",
  MARKET_PUBLISHABLE_KEY_ID_CZ: "pkid_cz",
  MARKET_PUBLISHABLE_KEY_ID_HU: "pkid_hu",
  MARKET_PUBLISHABLE_KEY_ID_RO: "pkid_ro",
  MARKET_PUBLISHABLE_KEY_ID_SK: "pkid_sk",
  MARKET_REGION_CZ: "reg_cz",
  MARKET_REGION_HU: "reg_hu",
  MARKET_REGION_RO: "reg_ro",
  MARKET_REGION_SK: "reg_sk",
  MARKET_SALES_CHANNEL_CZ: "sc_cz",
  MARKET_SALES_CHANNEL_HU: "sc_hu",
  MARKET_SALES_CHANNEL_RO: "sc_ro",
  MARKET_SALES_CHANNEL_SK: "sc_sk",
} as const

describe("createMarketRuntime", () => {
  it("builds the exact four-market server authority", () => {
    const runtime = createMarketRuntime(COMPLETE_ENVIRONMENT)

    expect(runtime.allowedMarkets).toEqual(["sk", "cz", "hu", "ro"])
    expect(getMarketRuntime(runtime, "sk")).toEqual({
      acceptedHosts: ["herbatica.sk"],
      canonicalOrigin: "https://herbatica.sk",
      countryCode: "SK",
      locale: "sk-SK",
      market: "sk",
      publishableApiKey: "pk_sk",
      publishableApiKeyId: "pkid_sk",
      regionId: "reg_sk",
      salesChannelId: "sc_sk",
    })
    expect(getMarketRuntime(runtime, "cz")).toMatchObject({
      canonicalOrigin: "https://herbatica.cz",
      countryCode: "CZ",
      locale: "cs-CZ",
    })
    expect(getMarketRuntime(runtime, "hu")).toMatchObject({
      canonicalOrigin: "https://herbatica.hu",
      countryCode: "HU",
      locale: "hu-HU",
    })
    expect(getMarketRuntime(runtime, "ro")).toMatchObject({
      canonicalOrigin: "https://herbatica.ro",
      countryCode: "RO",
      locale: "ro-RO",
    })
  })

  it("limits bindings and hosts to ALLOWED_MARKETS without a default", () => {
    const runtime = createMarketRuntime({
      ...COMPLETE_ENVIRONMENT,
      ACCEPT_LANGUAGE: "sk-SK,sk;q=0.9",
      ALLOWED_MARKETS: "ro,cz",
      NEXT_PUBLIC_MARKET: "sk",
    })

    expect(runtime.allowedMarkets).toEqual(["cz", "ro"])
    expect(getMarketRuntime(runtime, "sk")).toBeNull()
    expect(resolveMarketRuntimeByHost(runtime, "herbatica.sk")).toBeNull()
    expect(resolveMarketRuntimeByHost(runtime, "unknown.example")).toBeNull()
  })

  it.each([
    ["herbatica.sk", "sk"],
    ["HERBATICA.CZ:443", "cz"],
    ["herbatica.hu.", "hu"],
    ["herbatica.ro:3001", "ro"],
  ])("resolves the accepted host %s to only market %s", (host, market) => {
    const runtime = createMarketRuntime(COMPLETE_ENVIRONMENT)

    expect(resolveMarketRuntimeByHost(runtime, host)?.market).toBe(market)
  })

  it("accepts a known alias only when deployment ownership enables it", () => {
    const withoutAlias = createMarketRuntime(COMPLETE_ENVIRONMENT)
    const withAlias = createMarketRuntime({
      ...COMPLETE_ENVIRONMENT,
      MARKET_ACCEPTED_HOSTS_SK: "herbatica.sk,www.herbatica.sk",
    })

    expect(
      resolveMarketRuntimeByHost(withoutAlias, "www.herbatica.sk")
    ).toBeNull()
    expect(
      resolveMarketRuntimeByHost(withAlias, "www.herbatica.sk")?.market
    ).toBe("sk")
  })

  it.each([
    "",
    "herbatica.sk,evil.example",
    "https://herbatica.sk",
    "herbatica.sk:bad",
    "herbatica.sk:65536",
  ])("fails closed for an invalid or unknown Host value %j", (host) => {
    const runtime = createMarketRuntime(COMPLETE_ENVIRONMENT)

    expect(resolveMarketRuntimeByHost(runtime, host)).toBeNull()
  })

  it.each([
    "ALLOWED_MARKETS",
    "MARKET_ACCEPTED_HOSTS_SK",
    "MARKET_REGION_SK",
    "MARKET_SALES_CHANNEL_SK",
    "MARKET_PUBLISHABLE_KEY_SK",
    "MARKET_PUBLISHABLE_KEY_ID_SK",
  ])("fails fast when %s is missing", (environmentName) => {
    expect(() =>
      createMarketRuntime({
        ...COMPLETE_ENVIRONMENT,
        [environmentName]: undefined,
      })
    ).toThrow(`Missing server runtime environment variable ${environmentName}`)
  })

  it.each([
    ["sk,sk", "duplicate market sk"],
    ["sk,,cz", "empty market entry"],
    ["sk,de", "unknown market de"],
    ["SK", "unknown market SK"],
  ])("rejects invalid ALLOWED_MARKETS %j", (allowedMarkets, message) => {
    expect(() =>
      createMarketRuntime({
        ...COMPLETE_ENVIRONMENT,
        ALLOWED_MARKETS: allowedMarkets,
      })
    ).toThrow(message)
  })

  it.each([
    ["regionId", "MARKET_REGION_CZ", "reg_sk"],
    ["salesChannelId", "MARKET_SALES_CHANNEL_CZ", "sc_sk"],
    ["publishableApiKey", "MARKET_PUBLISHABLE_KEY_CZ", "pk_sk"],
    ["publishableApiKeyId", "MARKET_PUBLISHABLE_KEY_ID_CZ", "pkid_sk"],
  ])("rejects a cross-market duplicate %s", (field, environmentName, duplicateValue) => {
    expect(() =>
      createMarketRuntime({
        ...COMPLETE_ENVIRONMENT,
        [environmentName]: duplicateValue,
      })
    ).toThrow(`${field} is assigned to both sk and cz`)
  })

  it.each([
    "sc_sk,sc_other",
    "sc_sk sc_other",
  ])("requires exactly one salesChannelId instead of %j", (salesChannelId) => {
    expect(() =>
      createMarketRuntime({
        ...COMPLETE_ENVIRONMENT,
        MARKET_SALES_CHANNEL_SK: salesChannelId,
      })
    ).toThrow("MARKET_SALES_CHANNEL_SK must contain exactly one value")
  })

  it("never accepts NEXT_PUBLIC publishable-key authority", () => {
    expect(() =>
      createMarketRuntime({
        ...COMPLETE_ENVIRONMENT,
        MARKET_PUBLISHABLE_KEY_SK: undefined,
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_attacker",
      })
    ).toThrow(
      "Missing server runtime environment variable MARKET_PUBLISHABLE_KEY_SK"
    )
  })

  it("keeps the internal publishable-key identity separate from its secret value", () => {
    expect(() =>
      createMarketRuntime({
        ...COMPLETE_ENVIRONMENT,
        MARKET_PUBLISHABLE_KEY_ID_SK: "pk_sk",
      })
    ).toThrow(
      "MARKET_PUBLISHABLE_KEY_ID_SK must be distinct from the key value"
    )
  })

  it.each([
    ["www.herbatica.sk", "canonical host herbatica.sk"],
    ["herbatica.sk,evil.example", "not a declared route host"],
    ["herbatica.sk,herbatica.sk", "duplicate host herbatica.sk"],
  ])("rejects an invalid accepted-host manifest %j", (acceptedHosts, message) => {
    expect(() =>
      createMarketRuntime({
        ...COMPLETE_ENVIRONMENT,
        MARKET_ACCEPTED_HOSTS_SK: acceptedHosts,
      })
    ).toThrow(message)
  })
})
