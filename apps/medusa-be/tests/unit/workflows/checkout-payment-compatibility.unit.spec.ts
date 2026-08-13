import { describe, expect, it } from "vitest"
import {
  isOnSitePaymentCompatibleWithShipping,
  ON_SITE_PAYMENT_PROVIDER_ID,
} from "../../../src/workflows/hooks/checkout-payment-compatibility"

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
