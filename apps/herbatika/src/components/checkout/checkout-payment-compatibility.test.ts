import { describe, expect, it } from "vitest"
import {
  CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID,
  filterPaymentProvidersForShipping,
  isPaymentProviderCompatibleWithShipping,
  isRoDemoNoDebitCarrierShippingOption,
  ON_SITE_PAYMENT_PROVIDER_ID,
  RO_DEMO_NO_DEBIT_PAYMENT_LABEL,
  resolveRoDemoNoDebitPaymentLabel,
} from "./checkout-payment-compatibility"

const providers = [
  { id: CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID },
  { id: ON_SITE_PAYMENT_PROVIDER_ID },
  { id: "pp_paykit_gopay" },
]

const roDemoCheckoutMarker = {
  binding_sha256: "a".repeat(64),
  label: RO_DEMO_NO_DEBIT_PAYMENT_LABEL,
  locale: "ro-RO",
  market: "ro",
  payment_mode: "no-debit-demo",
  provider_id: ON_SITE_PAYMENT_PROVIDER_ID,
  schema_version: 1,
  source: "herbatica-ro-demo-commerce-v1",
}

const roDemoCarrierShippingOption = {
  data: { ro_demo_checkout: roDemoCheckoutMarker },
  service_zone: {
    fulfillment_set: { type: "shipping" },
  },
}

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

  it("offers only no-debit system payment for an exactly marked RO demo carrier", () => {
    expect(
      filterPaymentProvidersForShipping({
        paymentProviders: providers,
        shippingOption: roDemoCarrierShippingOption,
      })
    ).toEqual([{ id: ON_SITE_PAYMENT_PROVIDER_ID }])
    expect(
      resolveRoDemoNoDebitPaymentLabel({
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingOption: roDemoCarrierShippingOption,
      })
    ).toBe(RO_DEMO_NO_DEBIT_PAYMENT_LABEL)
  })

  it("does not resolve the RO demo label for any other provider", () => {
    expect(
      resolveRoDemoNoDebitPaymentLabel({
        paymentProviderId: "pp_paykit_gopay",
        shippingOption: roDemoCarrierShippingOption,
      })
    ).toBeUndefined()
  })

  it.each([
    ["Cargus", "ro-demo-cargus"],
    ["Packeta address", "ro-demo-packeta-address"],
    ["Packeta pickup", "ro-demo-packeta-pickup"],
  ])("gates the generated %s carrier on the exact RO demo marker", (_, code) => {
    const shippingOption = {
      ...roDemoCarrierShippingOption,
      data: { code, ro_demo_checkout: roDemoCheckoutMarker },
    }
    expect(
      isPaymentProviderCompatibleWithShipping({
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingOption,
      })
    ).toBe(true)

    const rejectedMarkers = [
      undefined,
      { ...roDemoCheckoutMarker, market: "sk" },
      { ...roDemoCheckoutMarker, label: "Plată demo" },
      { ...roDemoCheckoutMarker, binding_sha256: "not-a-valid-hash" },
    ]
    for (const marker of rejectedMarkers) {
      expect(
        isPaymentProviderCompatibleWithShipping({
          paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
          shippingOption: {
            ...shippingOption,
            data: {
              code,
              ...(marker ? { ro_demo_checkout: marker } : {}),
            },
          },
        })
      ).toBe(false)
    }
  })

  it("keeps COD disabled even when an RO demo carrier option claims COD support", () => {
    expect(
      filterPaymentProvidersForShipping({
        paymentProviders: providers,
        shippingOption: {
          ...roDemoCarrierShippingOption,
          data: {
            ...roDemoCarrierShippingOption.data,
            supports_cod: true,
          },
        },
      })
    ).toEqual([{ id: ON_SITE_PAYMENT_PROVIDER_ID }])
  })

  it.each([
    ["schema version", { schema_version: 2 }],
    ["market", { market: "sk" }],
    ["locale", { locale: "sk-SK" }],
    ["source", { source: "other" }],
    ["binding hash", { binding_sha256: "A".repeat(64) }],
    ["payment mode", { payment_mode: "live" }],
    ["provider", { provider_id: "pp_other" }],
    ["label", { label: "Plată demo" }],
  ])("fails closed when the RO demo marker has the wrong %s", (_, change) => {
    expect(
      isRoDemoNoDebitCarrierShippingOption({
        ...roDemoCarrierShippingOption,
        data: {
          ro_demo_checkout: { ...roDemoCheckoutMarker, ...change },
        },
      })
    ).toBe(false)
  })

  it("fails closed when the RO demo marker has an extra key", () => {
    expect(
      isRoDemoNoDebitCarrierShippingOption({
        ...roDemoCarrierShippingOption,
        data: {
          ro_demo_checkout: { ...roDemoCheckoutMarker, unexpected: true },
        },
      })
    ).toBe(false)
  })

  it("does not enable the demo fallback without a carrier fulfillment set", () => {
    expect(
      isPaymentProviderCompatibleWithShipping({
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingOption: {
          data: roDemoCarrierShippingOption.data,
        },
      })
    ).toBe(false)
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
