import { describe, expect, it } from "vitest"
import { createDeniedCheckoutConsent } from "@/lib/storefront/checkout-consent"
import { createCheckoutPurchaseAcceptance } from "@/lib/storefront/checkout-purchase-acceptance"
import {
  buildCheckoutMetadata,
  isCheckoutMetadataSynced,
  readOrderNote,
  resolveOrderNoteFormValue,
} from "./checkout-metadata"

const NOW = new Date()
const consent = createDeniedCheckoutConsent("sk", NOW)
const purchaseAcceptance = createCheckoutPurchaseAcceptance({
  cartId: "cart_sk",
  market: "sk",
  now: NOW,
})

describe("checkout metadata", () => {
  it("stores a normalized order note without dropping existing metadata", () => {
    expect(
      buildCheckoutMetadata({
        accountSetupRequested: true,
        cartId: "cart_sk",
        consent,
        metadata: { source: "storefront" },
        orderNote: "  Please call before delivery  ",
        purchaseAcceptance,
      })
    ).toEqual({
      account_setup_requested: true,
      checkout_consent: consent,
      checkout_purchase_acceptance: purchaseAcceptance,
      order_note: "Please call before delivery",
      source: "storefront",
    })
  })

  it("uses an empty string to remove a previously stored note", () => {
    expect(
      buildCheckoutMetadata({
        accountSetupRequested: false,
        cartId: "cart_sk",
        consent,
        metadata: { order_note: "Old note" },
        orderNote: "   ",
        purchaseAcceptance: null,
      })
    ).toEqual({
      account_setup_requested: false,
      checkout_consent: consent,
      checkout_purchase_acceptance: null,
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
        cartId: "cart_sk",
        consent,
        metadata: {
          account_setup_requested: true,
          checkout_consent: consent,
          checkout_purchase_acceptance: purchaseAcceptance,
          order_note: "Keep upright",
        },
        orderNote: "  Keep upright  ",
        purchaseAcceptance,
      })
    ).toBe(true)

    expect(
      isCheckoutMetadataSynced({
        accountSetupRequested: true,
        cartId: "cart_sk",
        consent,
        metadata: {
          account_setup_requested: true,
          checkout_consent: consent,
          checkout_purchase_acceptance: purchaseAcceptance,
          order_note: "Old note",
        },
        orderNote: "New note",
        purchaseAcceptance,
      })
    ).toBe(false)
  })

  it("rejects market, policy, or timestamp changes in stored consent", () => {
    expect(
      isCheckoutMetadataSynced({
        accountSetupRequested: false,
        cartId: "cart_sk",
        consent,
        metadata: {
          account_setup_requested: false,
          checkout_consent: { ...consent, market: "ro" },
          checkout_purchase_acceptance: purchaseAcceptance,
          order_note: "",
        },
        orderNote: "",
        purchaseAcceptance,
      })
    ).toBe(false)
    expect(
      isCheckoutMetadataSynced({
        accountSetupRequested: false,
        cartId: "cart_sk",
        consent,
        metadata: {
          account_setup_requested: false,
          checkout_consent: { ...consent, policyVersion: "old" },
          checkout_purchase_acceptance: purchaseAcceptance,
          order_note: "",
        },
        orderNote: "",
        purchaseAcceptance,
      })
    ).toBe(false)
  })

  it("rejects missing, cross-cart, cross-market, or stale purchase acceptance", () => {
    const base = {
      accountSetupRequested: false,
      cartId: "cart_sk",
      consent,
      orderNote: "",
      purchaseAcceptance,
    }

    for (const checkoutPurchaseAcceptance of [
      null,
      { ...purchaseAcceptance, cartId: "cart_other" },
      { ...purchaseAcceptance, market: "ro" },
      { ...purchaseAcceptance, termsVersion: "old" },
    ]) {
      expect(
        isCheckoutMetadataSynced({
          ...base,
          metadata: {
            account_setup_requested: false,
            checkout_consent: consent,
            checkout_purchase_acceptance: checkoutPurchaseAcceptance,
            order_note: "",
          },
        })
      ).toBe(false)
    }
  })
})
