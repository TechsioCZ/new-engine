import { describe, expect, it } from "vitest"
import { resolveCheckoutCartReadInput } from "./use-checkout-controller"

describe("checkout cart authority", () => {
  it("loads the server-authorized cart without creating a replacement", () => {
    expect(
      resolveCheckoutCartReadInput({
        allowCartAutoCreate: true,
        authorizedCartId: "cart_authorized",
        completedOrderId: null,
        countryCode: "ro",
        regionId: "reg_ro",
      })
    ).toEqual({
      autoCreate: false,
      cartId: "cart_authorized",
      country_code: "ro",
      enabled: true,
      region_id: "reg_ro",
    })
  })

  it("preserves active-cart auto creation for the public cart page", () => {
    expect(
      resolveCheckoutCartReadInput({
        allowCartAutoCreate: true,
        completedOrderId: null,
        countryCode: "ro",
        regionId: "reg_ro",
      })
    ).toEqual({
      autoCreate: true,
      cartId: undefined,
      country_code: "ro",
      enabled: true,
      region_id: "reg_ro",
    })
  })
})
