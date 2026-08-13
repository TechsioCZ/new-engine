import { describe, expect, it } from "vitest"
import {
  CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID,
  filterPaymentProvidersForShipping,
  isPaymentProviderCompatibleWithShipping,
  ON_SITE_PAYMENT_PROVIDER_ID,
} from "./checkout-payment-compatibility"

const providers = [
  { id: CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID },
  { id: ON_SITE_PAYMENT_PROVIDER_ID },
  { id: "pp_paykit_gopay" },
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
    ).toEqual([{ id: "pp_paykit_gopay" }])
  })

  it("offers on-site and online payment for a location pickup option", () => {
    expect(
      filterPaymentProvidersForShipping({
        paymentProviders: providers,
        shippingOption: {
          service_zone: {
            fulfillment_set: { type: "pickup" },
          },
        },
      })
    ).toEqual([{ id: ON_SITE_PAYMENT_PROVIDER_ID }, { id: "pp_paykit_gopay" }])
  })

  it("hides on-site payment for address delivery", () => {
    expect(
      filterPaymentProvidersForShipping({
        paymentProviders: providers,
        shippingOption: {
          service_zone: {
            fulfillment_set: { type: "shipping" },
          },
        },
      })
    ).toEqual([{ id: "pp_paykit_gopay" }])
  })

  it("does not infer personal pickup from the manual provider", () => {
    expect(
      isPaymentProviderCompatibleWithShipping({
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingOption: {
          provider_id: "manual_manual",
          service_zone: {
            fulfillment_set: { type: "shipping" },
          },
        },
      })
    ).toBe(false)
  })

  it("hides on-site payment until a shipping option is selected", () => {
    expect(
      isPaymentProviderCompatibleWithShipping({
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingOption: undefined,
      })
    ).toBe(false)
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
