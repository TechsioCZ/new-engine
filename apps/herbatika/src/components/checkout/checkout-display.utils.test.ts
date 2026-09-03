import { describe, expect, it } from "vitest"
import {
  resolvePaymentDisplayTextKeys,
  resolvePaymentIcon,
} from "./checkout-display.utils"
import {
  ON_SITE_PAYMENT_PROVIDER_ID,
  RO_DEMO_NO_DEBIT_PAYMENT_LABEL,
} from "./checkout-payment-compatibility"

const roDemoCarrierShippingOption = {
  data: {
    ro_demo_checkout: {
      binding_sha256: "a".repeat(64),
      label: RO_DEMO_NO_DEBIT_PAYMENT_LABEL,
      locale: "ro-RO",
      market: "ro",
      payment_mode: "no-debit-demo",
      provider_id: ON_SITE_PAYMENT_PROVIDER_ID,
      schema_version: 1,
      source: "herbatica-ro-demo-commerce-v1",
    },
  },
  service_zone: { fulfillment_set: { type: "shipping" } },
}

describe("checkout payment display", () => {
  it("maps the system provider to the localized on-site payment content", () => {
    expect(resolvePaymentDisplayTextKeys(ON_SITE_PAYMENT_PROVIDER_ID)).toEqual({
      descriptionKey: "payment_description_on_site",
      labelKey: "payment_provider_on_site",
      summaryLabelKey: "payment_provider_on_site",
    })
  })

  it("uses the cash icon for on-site payment", () => {
    expect(resolvePaymentIcon(ON_SITE_PAYMENT_PROVIDER_ID)).toBe(
      "token-icon-cash"
    )
  })

  it("uses the explicit no-debit label for the marked RO demo carrier", () => {
    expect(
      resolvePaymentDisplayTextKeys(
        ON_SITE_PAYMENT_PROVIDER_ID,
        roDemoCarrierShippingOption
      )
    ).toEqual({ providerName: RO_DEMO_NO_DEBIT_PAYMENT_LABEL })
  })

  it("does not leak the demo label to an unmarked carrier", () => {
    expect(
      resolvePaymentDisplayTextKeys(ON_SITE_PAYMENT_PROVIDER_ID, {
        service_zone: { fulfillment_set: { type: "shipping" } },
      })
    ).toEqual({
      descriptionKey: "payment_description_on_site",
      labelKey: "payment_provider_on_site",
      summaryLabelKey: "payment_provider_on_site",
    })
  })
})
