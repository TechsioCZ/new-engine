import { describe, expect, it } from "vitest"

import { defineStorefrontMarkets } from "../src/core/markets"

const resolver = defineStorefrontMarkets({
  defaultMarketCode: "sk",
  hostMarketMap: {
    "herbatica.cz": "cz",
  },
  languageMarketMap: {
    cs: "cz",
    sk: "sk",
  },
  markets: {
    cz: { code: "cz", label: "Czechia", locale: "cs-CZ" },
    sk: { code: "sk", label: "Slovakia", locale: "sk-SK" },
  },
})

describe(defineStorefrontMarkets, () => {
  it("resolves normalized hosts before accepted languages", () => {
    expect(
      resolver.resolveMarket({
        acceptLanguage: "sk;q=1",
        host: "https://HERBATICA.CZ:3001/path",
      }),
    ).toStrictEqual({ code: "cz", label: "Czechia", locale: "cs-CZ" })
  })

  it("uses quality-weighted accepted languages for unknown hosts", () => {
    expect(
      resolver.resolveMarket({
        acceptLanguage: "sk;q=0.5, cs-CZ;q=0.9",
        host: "preview.example.com",
      }).code,
    ).toBe("cz")
  })

  it("ignores explicitly rejected accepted languages", () => {
    expect(
      resolver.resolveMarket({
        acceptLanguage: "en;q=1, cs-CZ; q=0",
        host: "preview.example.com",
      }).code,
    ).toBe("sk")
  })

  it("uses the configured default when no signal matches", () => {
    expect(resolver.resolveMarket({ host: "preview.example.com" }).code).toBe(
      "sk",
    )
  })
})
