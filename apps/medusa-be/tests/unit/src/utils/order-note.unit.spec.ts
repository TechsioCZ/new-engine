import { describe, expect, it } from "vitest"
import { resolveOrderNote } from "../../../../src/utils/order-note"

describe("resolveOrderNote", () => {
  it("prefers the canonical order metadata note", () => {
    expect(
      resolveOrderNote({
        metadata: { order_note: "  Canonical note  " },
        shipping_address: {
          metadata: { customer_note: "Checkout note" },
        },
      })
    ).toBe("Canonical note")
  })

  it("falls back to the checkout note stored on the shipping address", () => {
    expect(
      resolveOrderNote({
        metadata: null,
        shipping_address: {
          metadata: { customer_note: "  Please call before delivery  " },
        },
      })
    ).toBe("Please call before delivery")
  })

  it("ignores empty and non-string note values", () => {
    expect(
      resolveOrderNote({
        metadata: { order_note: "   " },
        shipping_address: {
          metadata: { customer_note: 42 },
        },
      })
    ).toBeUndefined()
  })
})
