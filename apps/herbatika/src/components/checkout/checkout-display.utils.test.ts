import { describe, expect, it } from "vitest"
import {
  resolvePaymentDisplayTextKeys,
  resolvePaymentIcon,
} from "./checkout-display.utils"
import { ON_SITE_PAYMENT_PROVIDER_ID } from "./checkout-payment-compatibility"

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
})
