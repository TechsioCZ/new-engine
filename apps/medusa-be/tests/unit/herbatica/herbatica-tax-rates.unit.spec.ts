import { describe, expect, it } from "vitest"
import {
  buildTaxRateSeedTargets,
  HERBATICA_DEFAULT_TAX_RATES,
} from "../../../src/workflows/seed/steps/create-tax-rates"

function mapEntries<Value>(map: Map<string, Value>) {
  return Array.from(map.entries())
}

describe("Herbatica tax-rate seed policy", () => {
  it("uses explicit approved default rates only", () => {
    const targets = buildTaxRateSeedTargets(
      [
        {
          id: "prod_23",
          metadata: {
            top_offer: {
              vat: 23,
              oss_tax_rates: [
                {
                  country: "hu",
                  level: "high",
                },
              ],
            },
          },
        },
      ],
      ["sk", "cz", "hu"]
    )

    expect(mapEntries(HERBATICA_DEFAULT_TAX_RATES)).toEqual([
      ["sk", 23],
      ["cz", 19],
    ])
    expect(mapEntries(targets.defaultRatesByCountry)).toEqual([
      ["sk", 23],
      ["cz", 19],
    ])
    expect(mapEntries(targets.productRatesByCountry)).toEqual([])
  })

  it("creates Slovakia product overrides only when product VAT differs from Slovak default", () => {
    const targets = buildTaxRateSeedTargets(
      [
        {
          id: "prod_default",
          metadata: {
            top_offer: {
              vat: "23",
            },
          },
        },
        {
          id: "prod_lower",
          metadata: {
            top_offer: {
              vat: "19",
            },
          },
        },
        {
          id: "prod_second_lower",
          metadata: {
            top_offer: {
              vat: 5,
            },
          },
        },
        {
          id: "prod_zero",
          metadata: {
            top_offer: {
              vat: 0,
            },
          },
        },
        {
          id: "prod_missing",
          metadata: {
            top_offer: {},
          },
        },
      ],
      ["sk", "cz"]
    )

    expect(mapEntries(targets.productRatesByCountry)).toEqual([
      [
        "sk",
        new Map([
          ["prod_lower", 19],
          ["prod_second_lower", 5],
          ["prod_zero", 0],
        ]),
      ],
    ])
    expect(targets.productRatesByCountry.has("cz")).toBe(false)
  })

  it("does not emit Slovakia product overrides when Slovakia is not an approved target country", () => {
    const targets = buildTaxRateSeedTargets(
      [
        {
          id: "prod_lower",
          metadata: {
            top_offer: {
              vat: 19,
            },
          },
        },
      ],
      ["cz"]
    )

    expect(mapEntries(targets.defaultRatesByCountry)).toEqual([["cz", 19]])
    expect(mapEntries(targets.productRatesByCountry)).toEqual([])
  })
})
