import { describe, expect, it } from "vitest"
import {
  buildProductTaxRateIdentity,
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
    expect(mapEntries(targets.productRateGroupsByCountry)).toEqual([])
  })

  it("groups Slovakia product overrides by VAT rate when product VAT differs from Slovak default", () => {
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
          id: "prod_lower_other",
          metadata: {
            top_offer: {
              vat: 19,
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

    expect(mapEntries(targets.productRateGroupsByCountry)).toEqual([
      [
        "sk",
        new Map([
          [19, ["prod_lower", "prod_lower_other"]],
          [5, ["prod_second_lower"]],
          [0, ["prod_zero"]],
        ]),
      ],
    ])
    expect(targets.productRateGroupsByCountry.has("cz")).toBe(false)
  })

  it("names grouped product override rates by country and VAT rate", () => {
    expect(buildProductTaxRateIdentity("sk", 19)).toEqual({
      code: "vat_sk_product_19",
      name: "VAT SK Product 19%",
    })
    expect(buildProductTaxRateIdentity("sk", 5)).toEqual({
      code: "vat_sk_product_5",
      name: "VAT SK Product 5%",
    })
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
    expect(mapEntries(targets.productRateGroupsByCountry)).toEqual([])
  })
})
