import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { resolveBoundRegion } from "./market-region-authority"

const BINDING: MarketRuntimeBinding = {
  acceptedHosts: ["herbatica.cz"],
  canonicalOrigin: "https://herbatica.cz",
  countryCode: "CZ",
  locale: "cs-CZ",
  market: "cz",
  publishableApiKey: "pk_cz",
  publishableApiKeyId: "pkid_cz",
  regionId: "reg_cz",
  salesChannelId: "sc_cz",
}

const region = (id: string, countries: string[]): HttpTypes.StoreRegion =>
  ({
    countries: countries.map((iso_2) => ({ iso_2 })),
    currency_code: "czk",
    id,
  }) as HttpTypes.StoreRegion

describe("resolveBoundRegion", () => {
  it("returns only the configured region when it contains the market country", () => {
    expect(
      resolveBoundRegion(BINDING, [
        region("reg_other", ["cz"]),
        region("reg_cz", ["sk", "cz"]),
      ])
    ).toEqual({
      country_code: "cz",
      currency_code: "CZK",
      region_id: "reg_cz",
    })
  })

  it("does not fall back to another region containing the same country", () => {
    expect(() =>
      resolveBoundRegion(BINDING, [region("reg_other", ["cz"])])
    ).toThrow("Configured region is unavailable for market cz")
  })

  it("rejects a configured region that does not contain the market country", () => {
    expect(() =>
      resolveBoundRegion(BINDING, [region("reg_cz", ["sk"])])
    ).toThrow("Configured region does not contain the country for market cz")
  })
})
