import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import { resolveLineItemUnitAmount } from "./cart-calculations"

const toLineItem = (
  value: Record<string, unknown>
): HttpTypes.StoreCartLineItem =>
  value as unknown as HttpTypes.StoreCartLineItem

describe("resolveLineItemUnitAmount", () => {
  it("uses Medusa adjusted totals when a native promotion is applied", () => {
    expect(
      resolveLineItemUnitAmount(
        toLineItem({
          quantity: 5,
          unit_price: 1000,
          original_total: 5000,
          discount_total: 500,
          total: 4500,
        })
      )
    ).toBe(900)
  })

  it("keeps the native unit price when no promotion adjustment exists", () => {
    expect(
      resolveLineItemUnitAmount(
        toLineItem({
          quantity: 2,
          unit_price: 1000,
          original_total: 2000,
          discount_total: 0,
          total: 2000,
        })
      )
    ).toBe(1000)
  })
})
