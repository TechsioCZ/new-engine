import { describe, expect, it } from "vitest"
import { buildShippingOptionWorkflowPrices } from "../steps/create-shipping-options"

describe("buildShippingOptionWorkflowPrices", () => {
  it("preserves free-shipping item-total rules in Medusa workflow input", () => {
    expect(
      buildShippingOptionWorkflowPrices({
        prices: [
          { amount: 9.9, currencyCode: "eur" },
          {
            amount: 0,
            currencyCode: "eur",
            rules: [{ attribute: "item_total", operator: "gte", value: 49 }],
          },
        ],
        regions: [{ amount: 9.9, id: "reg_europe" } as never],
      })
    ).toEqual([
      { amount: 9.9, currency_code: "eur" },
      {
        amount: 0,
        currency_code: "eur",
        rules: [{ attribute: "item_total", operator: "gte", value: 49 }],
      },
      { amount: 9.9, region_id: "reg_europe" },
    ])
  })
})
