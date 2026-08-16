import { describe, expect, it } from "vitest"
import {
  buildCheckoutMetadata,
  isCheckoutMetadataSynced,
  readOrderNote,
  resolveOrderNoteFormValue,
} from "./checkout-metadata"

describe("checkout metadata", () => {
  it("stores a normalized order note without dropping existing metadata", () => {
    expect(
      buildCheckoutMetadata({
        accountSetupRequested: true,
        metadata: { source: "storefront" },
        orderNote: "  Please call before delivery  ",
      })
    ).toEqual({
      account_setup_requested: true,
      order_note: "Please call before delivery",
      source: "storefront",
    })
  })

  it("uses an empty string to remove a previously stored note", () => {
    expect(
      buildCheckoutMetadata({
        accountSetupRequested: false,
        metadata: { order_note: "Old note" },
        orderNote: "   ",
      })
    ).toEqual({
      account_setup_requested: false,
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
        metadata: {
          account_setup_requested: true,
          order_note: "Keep upright",
        },
        orderNote: "  Keep upright  ",
      })
    ).toBe(true)

    expect(
      isCheckoutMetadataSynced({
        accountSetupRequested: true,
        metadata: {
          account_setup_requested: true,
          order_note: "Old note",
        },
        orderNote: "New note",
      })
    ).toBe(false)
  })
})
