import { describe, expect, it } from "vitest"
import { resolveOrderItemOriginalTotalAmount } from "./order-format"

describe("order item price formatting", () => {
  it("prefers the historical original line total", () => {
    expect(
      resolveOrderItemOriginalTotalAmount({
        original_total: 5000,
        quantity: 2,
        total: 4000,
        unit_price: 2000,
      })
    ).toBe(5000)
  })

  it("falls back to the historical compare-at unit price", () => {
    expect(
      resolveOrderItemOriginalTotalAmount({
        compare_at_unit_price: 2500,
        quantity: 2,
        total: 4000,
        unit_price: 2000,
      })
    ).toBe(5000)
  })

  it("falls back to the persisted top-offer price", () => {
    expect(
      resolveOrderItemOriginalTotalAmount({
        metadata: {
          top_offer: {
            action_price: 2000,
            compare_at_price: 2500,
            has_active_discount: true,
          },
        },
        quantity: 2,
        total: 4000,
        unit_price: 2000,
      })
    ).toBe(5000)
  })

  it("omits an original price when it is not higher", () => {
    expect(
      resolveOrderItemOriginalTotalAmount({
        original_total: 4000,
        quantity: 2,
        total: 4000,
      })
    ).toBeNull()
  })
})
