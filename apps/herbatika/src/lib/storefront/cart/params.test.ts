import { describe, expect, it } from "vitest"
import { buildAddLineItemParams } from "./params"

describe("buildAddLineItemParams", () => {
  it("omits cart context fields rejected by the Medusa line-item endpoint", () => {
    expect(
      buildAddLineItemParams({
        autoCreate: true,
        cartId: "cart_1",
        country_code: "sk",
        quantity: 2,
        region_id: "reg_1",
        sales_channel_id: "sc_1",
        salesChannelId: "sc_1",
        variantId: "variant_1",
      })
    ).toEqual({
      quantity: 2,
      variant_id: "variant_1",
    })
  })

  it("preserves supported line-item metadata", () => {
    expect(
      buildAddLineItemParams({
        metadata: { source: "product-detail" },
        variantId: "variant_1",
      })
    ).toEqual({
      metadata: { source: "product-detail" },
      variant_id: "variant_1",
    })
  })
})
