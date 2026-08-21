import { describe, expect, it } from "vitest"
import { createDeniedCheckoutConsent } from "@/lib/storefront/checkout-consent"
import {
  buildCheckoutMetadata,
  isCheckoutMetadataSynced,
  readOrderNote,
  resolveOrderNoteFormValue,
} from "./checkout-metadata"

const NOW = new Date()
const consent = createDeniedCheckoutConsent("sk", NOW)

describe("checkout metadata", () => {
  it("stores a normalized order note without dropping existing metadata", () => {
    expect(
      buildCheckoutMetadata({
        accountSetupRequested: true,
        consent,
        metadata: { source: "storefront" },
        orderNote: "  Please call before delivery  ",
      })
    ).toEqual({
      account_setup_requested: true,
      checkout_consent: consent,
      order_note: "Please call before delivery",
      source: "storefront",
    })
  })

  it("uses an empty string to remove a previously stored note", () => {
    expect(
      buildCheckoutMetadata({
        accountSetupRequested: false,
        consent,
        metadata: { order_note: "Old note" },
        orderNote: "   ",
      })
    ).toEqual({
      account_setup_requested: false,
      checkout_consent: consent,
      order_note: "",
    })
  })

  it("reads only non-empty string notes", () => {
    expect(readOrderNote({ order_note: "  Keep upright  " })).toBe(
      "Keep upright"
    )
    expect(readOrderNote({ order_note: 42 })).toBeUndefined()
    expect(readOrderNote({ order_note: "  " })).toBeUndefined()
  })

  it("prefers cart metadata while retaining the legacy address fallback", () => {
    expect(
      resolveOrderNoteFormValue({ order_note: "Current note" }, "Legacy note")
    ).toBe("Current note")
    expect(resolveOrderNoteFormValue({}, "Legacy note")).toBe("Legacy note")
  })

  it("compares normalized checkout metadata", () => {
    expect(
      isCheckoutMetadataSynced({
        accountSetupRequested: true,
        consent,
        metadata: {
          account_setup_requested: true,
          checkout_consent: consent,
          order_note: "Keep upright",
        },
        orderNote: "  Keep upright  ",
      })
    ).toBe(true)

    expect(
      isCheckoutMetadataSynced({
        accountSetupRequested: true,
        consent,
        metadata: {
          account_setup_requested: true,
          checkout_consent: consent,
          order_note: "Old note",
        },
        orderNote: "New note",
      })
    ).toBe(false)
  })

  it("rejects market, policy, or timestamp changes in stored consent", () => {
    expect(
      isCheckoutMetadataSynced({
        accountSetupRequested: false,
        consent,
        metadata: {
          account_setup_requested: false,
          checkout_consent: { ...consent, market: "ro" },
          order_note: "",
        },
        orderNote: "",
      })
    ).toBe(false)
    expect(
      isCheckoutMetadataSynced({
        accountSetupRequested: false,
        consent,
        metadata: {
          account_setup_requested: false,
          checkout_consent: { ...consent, policyVersion: "old" },
          order_note: "",
        },
        orderNote: "",
      })
    ).toBe(false)
  })
})
