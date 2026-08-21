import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { resolveBoundRegion } from "./market-region-authority"

const MARKET_CASES = [
  { countryCode: "SK", currencyCode: "EUR", locale: "sk-SK", market: "sk" },
  { countryCode: "CZ", currencyCode: "CZK", locale: "cs-CZ", market: "cz" },
  { countryCode: "HU", currencyCode: "HUF", locale: "hu-HU", market: "hu" },
  { countryCode: "RO", currencyCode: "RON", locale: "ro-RO", market: "ro" },
] as const

const binding = (
  marketCase: (typeof MARKET_CASES)[number]
): MarketRuntimeBinding => ({
  acceptedHosts: [`herbatica.${marketCase.market}`],
  canonicalOrigin: `https://herbatica.${marketCase.market}`,
  countryCode: marketCase.countryCode,
  locale: marketCase.locale,
  market: marketCase.market,
  publishableApiKey: `pk_${marketCase.market}`,
  publishableApiKeyId: `pkid_${marketCase.market}`,
  regionId: `reg_${marketCase.market}`,
  salesChannelId: `sc_${marketCase.market}`,
})

const region = (
  id: string,
  countries: string[],
  currencyCode: string
): HttpTypes.StoreRegion =>
  ({
    countries: countries.map((iso_2) => ({ iso_2 })),
    currency_code: currencyCode,
    id,
  }) as HttpTypes.StoreRegion

describe("resolveBoundRegion", () => {
  it.each(
    MARKET_CASES
  )("binds $market to its configured region, country, and $currencyCode currency", (marketCase) => {
    expect(
      resolveBoundRegion(binding(marketCase), [
        region("reg_other", [marketCase.countryCode], marketCase.currencyCode),
        region(
          `reg_${marketCase.market}`,
          [marketCase.countryCode],
          marketCase.currencyCode.toLowerCase()
        ),
      ])
    ).toEqual({
      country_code: marketCase.countryCode.toLowerCase(),
      currency_code: marketCase.currencyCode,
      region_id: `reg_${marketCase.market}`,
    })
  })

  it.each([
    { ...MARKET_CASES[0], wrongCurrencyCode: "CZK" },
    { ...MARKET_CASES[1], wrongCurrencyCode: "HUF" },
    { ...MARKET_CASES[2], wrongCurrencyCode: "RON" },
    { ...MARKET_CASES[3], wrongCurrencyCode: "EUR" },
  ])("rejects $market when its configured region uses $wrongCurrencyCode instead of $currencyCode", (marketCase) => {
    expect(() =>
      resolveBoundRegion(binding(marketCase), [
        region(
          `reg_${marketCase.market}`,
          [marketCase.countryCode],
          marketCase.wrongCurrencyCode
        ),
      ])
    ).toThrow(
      `Configured region currency does not match market ${marketCase.market}: expected ${marketCase.currencyCode}`
    )
  })

  it("does not fall back to another region containing the same country", () => {
    const czBinding = binding(MARKET_CASES[1])
    expect(() =>
      resolveBoundRegion(czBinding, [region("reg_other", ["cz"], "CZK")])
    ).toThrow("Configured region is unavailable for market cz")
  })

  it("rejects a configured region that does not contain the market country", () => {
    const czBinding = binding(MARKET_CASES[1])
    expect(() =>
      resolveBoundRegion(czBinding, [region("reg_cz", ["sk"], "CZK")])
    ).toThrow("Configured region does not contain the country for market cz")
  })
})
