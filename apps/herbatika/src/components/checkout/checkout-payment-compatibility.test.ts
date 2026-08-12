import { describe, expect, it } from "vitest"
import {
  CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID,
  filterPaymentProvidersForShipping,
  isPaymentProviderCompatibleWithShipping,
} from "./checkout-payment-compatibility"

const providers = [
  { id: CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID },
  { id: "pp_system_default" },
]

describe("checkout payment compatibility", () => {
  it.each([
    "home_delivery_cod",
    "parcelshop_cod",
  ])("keeps only cash on delivery for GLS %s", (code) => {
    expect(
      filterPaymentProvidersForShipping({
        paymentProviders: providers,
        shippingOption: { data: { code, supports_cod: true } },
      })
    ).toEqual([{ id: CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID }])
  })

  it.each([
    "home_delivery",
    "parcelshop",
  ])("removes cash on delivery for GLS %s", (code) => {
    expect(
      filterPaymentProvidersForShipping({
        paymentProviders: providers,
        shippingOption: { data: { code, supports_cod: false } },
      })
    ).toEqual([{ id: "pp_system_default" }])
  })

  it("rejects a missing provider", () => {
    expect(
      isPaymentProviderCompatibleWithShipping({
        paymentProviderId: null,
        shippingOption: { data: { code: "home_delivery" } },
      })
    ).toBe(false)
  })
})
