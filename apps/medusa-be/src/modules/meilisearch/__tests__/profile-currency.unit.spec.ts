import { describe, expect, it } from "vitest"
import { resolveVerifiedFacetPriceCurrency } from "../profile-currency"

describe("Meilisearch profile facet-price currency", () => {
  it.each([
    ["sk-SK", "EUR", "eur"],
    ["cs_CZ", "czk", "czk"],
    ["hu-HU", "HUF", "huf"],
    ["ro-RO", "ron", "ron"],
  ])("verifies %s against its exact %s contract", (locale, currency, expected) => {
    expect(
      resolveVerifiedFacetPriceCurrency(locale, {
        pricingContextCurrencyCode: currency,
        requestedCurrencyCode: currency,
      })
    ).toBe(expected)
  })

  it.each([
    ["missing currency proof", "sk-SK", undefined, undefined],
    ["unsupported locale", "de-DE", "eur", "eur"],
    ["wrong profile currency", "cs-CZ", "eur", "eur"],
    ["mixed request scope", "hu-HU", "huf", "eur"],
    ["blank competing scope", "ro-RO", "ron", " "],
  ])("fails closed for %s", (_label, locale, pricingContextCurrencyCode, requestedCurrencyCode) => {
    expect(
      resolveVerifiedFacetPriceCurrency(locale, {
        pricingContextCurrencyCode,
        requestedCurrencyCode,
      })
    ).toBeUndefined()
  })
})
