import { describe, expect, it } from "vitest"
import { resolveRegionSalesChannelBindings } from "../steps/create-regions"

const region = {
  countries: ["ro"],
  currencyCode: "ron",
  isTaxInclusive: true,
  marketCode: "ro",
  name: "Romania",
  salesChannelName: "Herbatica Storefront RO",
}

describe("region market metadata reconciliation", () => {
  it("binds canonical market metadata to the reconciled Sales Channel ID", () => {
    expect(
      resolveRegionSalesChannelBindings({
        regions: [region],
        salesChannels: [
          { id: "sc_ro_runtime", name: "Herbatica Storefront RO" },
        ],
      })
    ).toEqual([
      {
        countries: ["ro"],
        currencyCode: "ron",
        isTaxInclusive: true,
        metadata: {
          market_code: "ro",
          sales_channel_id: "sc_ro_runtime",
        },
        name: "Romania",
      },
    ])
  })

  it("preserves generic regions without a market binding", () => {
    expect(
      resolveRegionSalesChannelBindings({
        regions: [{ name: "Generic", currencyCode: "eur" }],
        salesChannels: [],
      })
    ).toEqual([{ name: "Generic", currencyCode: "eur" }])
  })

  it.each([
    [
      "partial binding",
      { ...region, salesChannelName: undefined },
      [{ id: "sc_ro", name: "Herbatica Storefront RO" }],
    ],
    ["missing channel", region, []],
    [
      "ambiguous channel",
      region,
      [
        { id: "sc_ro_1", name: "Herbatica Storefront RO" },
        { id: "sc_ro_2", name: "Herbatica Storefront RO" },
      ],
    ],
    [
      "non-canonical market code",
      { ...region, marketCode: "RO" },
      [{ id: "sc_ro", name: "Herbatica Storefront RO" }],
    ],
    [
      "empty binding",
      { ...region, marketCode: "", salesChannelName: "" },
      [{ id: "sc_ro", name: "Herbatica Storefront RO" }],
    ],
  ] as const)("fails closed for a %s", (_case, configuredRegion, salesChannels) => {
    expect(() =>
      resolveRegionSalesChannelBindings({
        regions: [configuredRegion],
        salesChannels: [...salesChannels],
      })
    ).toThrow()
  })

  it("rejects duplicate market or Sales Channel bindings", () => {
    expect(() =>
      resolveRegionSalesChannelBindings({
        regions: [region, { ...region, name: "Romania duplicate" }],
        salesChannels: [
          { id: "sc_ro_runtime", name: "Herbatica Storefront RO" },
        ],
      })
    ).toThrow("duplicate market or Sales Channel binding")
  })
})
