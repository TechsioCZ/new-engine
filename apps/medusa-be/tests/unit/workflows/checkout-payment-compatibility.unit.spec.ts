import { describe, expect, it } from "vitest"
import {
  isOnSitePaymentCompatibleWithShipping,
  ON_SITE_PAYMENT_PROVIDER_ID,
  RO_DEMO_CHECKOUT_MARKER_KEY,
} from "../../../src/workflows/hooks/checkout-payment-compatibility"

const bindingSha256 = "a".repeat(64)
const roDemoCheckoutMarker = {
  binding_sha256: bindingSha256,
  label: "Plată demo (fără debitare)",
  locale: "ro-RO",
  market: "ro",
  payment_mode: "no-debit-demo",
  provider_id: ON_SITE_PAYMENT_PROVIDER_ID,
  schema_version: 1,
  source: "herbatika-ro-demo-commerce-v1",
}

const roDemoCart = {
  currency_code: "ron",
  region: {
    countries: [{ iso_2: "ro" }],
    currency_code: "ron",
    metadata: {
      demo: true,
      demo_source: "herbatika-ro-demo-commerce-v1",
      market_code: "ro",
      [RO_DEMO_CHECKOUT_MARKER_KEY]: roDemoCheckoutMarker,
      sales_channel_id: "sc_ro_demo",
    },
  },
  sales_channel_id: "sc_ro_demo",
  shipping_address: { country_code: "ro" },
}

const roDemoCarrierShippingMethods = [
  {
    shipping_option: {
      data: {
        [RO_DEMO_CHECKOUT_MARKER_KEY]: roDemoCheckoutMarker,
      },
      service_zone: {
        fulfillment_set: { type: "shipping" },
      },
    },
  },
]

describe("checkout payment compatibility", () => {
  it("allows on-site payment for a location pickup", () => {
    expect(
      isOnSitePaymentCompatibleWithShipping({
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingMethods: [
          {
            shipping_option: {
              service_zone: {
                fulfillment_set: { type: "pickup" },
              },
            },
          },
        ],
      })
    ).toBe(true)
  })

  it("rejects on-site payment for address delivery using the manual provider", () => {
    expect(
      isOnSitePaymentCompatibleWithShipping({
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingMethods: [
          {
            shipping_option: {
              provider_id: "manual_manual",
              service_zone: {
                fulfillment_set: { type: "shipping" },
              },
            },
          },
        ],
      })
    ).toBe(false)
  })

  it("rejects mixed pickup and unmarked carrier fulfillment", () => {
    expect(
      isOnSitePaymentCompatibleWithShipping({
        cart: roDemoCart,
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingMethods: [
          {
            shipping_option: {
              service_zone: { fulfillment_set: { type: "pickup" } },
            },
          },
          {
            shipping_option: {
              service_zone: { fulfillment_set: { type: "shipping" } },
            },
          },
        ],
      })
    ).toBe(false)
  })

  it("allows the no-debit system provider for the exact RO demo carrier context", () => {
    expect(
      isOnSitePaymentCompatibleWithShipping({
        cart: roDemoCart,
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingMethods: roDemoCarrierShippingMethods,
      })
    ).toBe(true)
  })

  it("rejects an exact RO demo marker reused for a non-RO cart", () => {
    expect(
      isOnSitePaymentCompatibleWithShipping({
        cart: {
          ...roDemoCart,
          shipping_address: { country_code: "sk" },
        },
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingMethods: roDemoCarrierShippingMethods,
      })
    ).toBe(false)
  })

  it("rejects legacy reusable demo flags without the plan-bound marker", () => {
    expect(
      isOnSitePaymentCompatibleWithShipping({
        cart: {
          ...roDemoCart,
          region: {
            ...roDemoCart.region,
            metadata: {
              demo: true,
              demo_source: "herbatika-ro-demo-commerce-v1",
              market_code: "ro",
              sales_channel_id: "sc_ro_demo",
            },
          },
        },
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingMethods: roDemoCarrierShippingMethods,
      })
    ).toBe(false)
  })

  it("rejects a carrier marker whose binding differs from the region", () => {
    expect(
      isOnSitePaymentCompatibleWithShipping({
        cart: roDemoCart,
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingMethods: [
          {
            ...roDemoCarrierShippingMethods[0],
            shipping_option: {
              ...roDemoCarrierShippingMethods[0]?.shipping_option,
              data: {
                [RO_DEMO_CHECKOUT_MARKER_KEY]: {
                  ...roDemoCheckoutMarker,
                  binding_sha256: "b".repeat(64),
                },
              },
            },
          },
        ],
      })
    ).toBe(false)
  })

  it("rejects a marker with extra reusable fields", () => {
    expect(
      isOnSitePaymentCompatibleWithShipping({
        cart: roDemoCart,
        paymentProviderId: ON_SITE_PAYMENT_PROVIDER_ID,
        shippingMethods: [
          {
            ...roDemoCarrierShippingMethods[0],
            shipping_option: {
              ...roDemoCarrierShippingMethods[0]?.shipping_option,
              data: {
                [RO_DEMO_CHECKOUT_MARKER_KEY]: {
                  ...roDemoCheckoutMarker,
                  enabled: true,
                },
              },
            },
          },
        ],
      })
    ).toBe(false)
  })

  it("allows online payment for both pickup and address delivery", () => {
    for (const fulfillmentType of ["pickup", "shipping"]) {
      expect(
        isOnSitePaymentCompatibleWithShipping({
          paymentProviderId: "pp_paykit_gopay",
          shippingMethods: [
            {
              shipping_option: {
                service_zone: {
                  fulfillment_set: { type: fulfillmentType },
                },
              },
            },
          ],
        })
      ).toBe(true)
    }
  })
})
