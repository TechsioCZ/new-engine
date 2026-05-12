import { describe, expect, it } from "vitest"

import {
  assertCommercialValuesEditable,
  type CommercialValuesOrder,
  toCommercialValuesCalculationInput,
  toCommercialValuesSnapshot,
} from "../../../../../../../../src/api/admin/orders/[id]/commercial-values/utils"
import {
  calculateCommercialValuesPreview,
  MANUAL_ITEM_DISCOUNT_CODE,
  MANUAL_ORDER_DISCOUNT_CODE,
} from "../../../../../../../../src/utils/order-commercial-values"

function createMockOrder(
  overrides: Partial<CommercialValuesOrder> = {}
): CommercialValuesOrder {
  const baseOrder: CommercialValuesOrder = {
    currency_code: "czk",
    id: "order_1",
    items: [
      {
        id: "item_1",
        is_discountable: true,
        quantity: 1,
        unit_price: 1000,
      },
    ],
    status: "pending",
    total: 1000,
    version: 1,
  }

  return {
    ...baseOrder,
    ...overrides,
    items: overrides.items ?? baseOrder.items,
  }
}

class MedusaBigNumberLike {
  numeric_: string

  constructor(value: string) {
    this.numeric_ = value
  }

  toString() {
    return this.numeric_
  }
}

describe("commercial values route utils", () => {
  it("builds snapshots for fractional Medusa amounts", () => {
    const snapshot = toCommercialValuesSnapshot(
      createMockOrder({
        currency_code: "eur",
        items: [
          {
            adjustments: [{ amount: 0.5, code: "promo_50" }],
            id: "item_1",
            is_discountable: true,
            quantity: 1.5,
            unit_price: 19.99,
          },
        ],
        total: 19.49,
        version: 2,
      })
    )

    expect(snapshot.totals.current_total).toBe(19.49)
    expect(snapshot.items[0].quantity).toBe(1.5)
    expect(snapshot.items[0].unit_price).toBe(19.99)
    expect(snapshot.items[0].existing_adjustments[0].amount).toBe(0.5)
  })

  it("includes line item display metadata in snapshots", () => {
    const snapshot = toCommercialValuesSnapshot(
      createMockOrder({
        items: [
          {
            id: "item_1",
            is_discountable: true,
            product_title: "Premium Hoodie",
            quantity: 1,
            subtitle: "Cotton fleece",
            thumbnail: "https://example.test/hoodie.jpg",
            title: "Premium Hoodie / Black",
            unit_price: 1000,
            variant_sku: "HOOD-BLK",
            variant_title: "Black",
          },
        ],
      })
    )

    expect(snapshot.items[0]).toMatchObject({
      item_id: "item_1",
      product_title: "Premium Hoodie",
      subtitle: "Cotton fleece",
      thumbnail: "https://example.test/hoodie.jpg",
      title: "Premium Hoodie / Black",
      variant_sku: "HOOD-BLK",
      variant_title: "Black",
    })
  })

  it("returns semantic edit blocker codes for admin localization", () => {
    const snapshot = toCommercialValuesSnapshot(
      createMockOrder({ status: "canceled" }),
      {
        id: "oc_1",
        status: "pending",
        version: 1,
      }
    )

    expect(snapshot.edit_blockers).toEqual([
      {
        code: "order_status_not_editable",
        status: "canceled",
      },
      {
        code: "active_order_change_exists",
        order_change_id: "oc_1",
      },
    ])
  })

  it("allows commercial values while a pending native order edit is active", () => {
    const snapshot = toCommercialValuesSnapshot(createMockOrder(), {
      change_type: "edit",
      id: "oc_1",
      status: "pending",
      version: 1,
    })

    expect(snapshot.editable).toBe(true)
    expect(snapshot.edit_blockers).toEqual([])
  })

  it("derives unit price from line subtotal when Medusa omits item unit price", () => {
    const snapshot = toCommercialValuesSnapshot(
      createMockOrder({
        items: [
          {
            id: "item_1",
            is_discountable: true,
            quantity: 2,
            subtotal: 500,
            unit_price: null,
          },
        ],
        total: 500,
      })
    )

    expect(snapshot.items[0].unit_price).toBe(250)
    expect(snapshot.items[0].original_unit_price).toBe(250)
  })

  it("reads quantity and unit price from Medusa item detail fallback fields", () => {
    const snapshot = toCommercialValuesSnapshot(
      createMockOrder({
        items: [
          {
            detail: {
              quantity: "2",
              unit_price: "250",
            },
            id: "item_1",
            is_discountable: true,
          },
        ],
        total: 500,
      })
    )

    expect(snapshot.items[0].quantity).toBe(2)
    expect(snapshot.items[0].unit_price).toBe(250)
  })

  it("reads Medusa raw amount objects when normalized fields are missing", () => {
    const snapshot = toCommercialValuesSnapshot(
      createMockOrder({
        items: [
          {
            id: "item_1",
            is_discountable: true,
            raw_quantity: { value: "2" },
            raw_unit_price: { value: "250" },
          },
        ],
        total: 500,
      })
    )

    expect(snapshot.items[0].quantity).toBe(2)
    expect(snapshot.items[0].unit_price).toBe(250)
  })

  it("reads Medusa BigNumber-like amount objects from query graph", () => {
    const snapshot = toCommercialValuesSnapshot(
      createMockOrder({
        items: [
          {
            id: "item_1",
            is_discountable: true,
            quantity: new MedusaBigNumberLike("2"),
            unit_price: new MedusaBigNumberLike("250"),
          },
        ],
        total: 500,
      })
    )

    expect(snapshot.items[0].quantity).toBe(2)
    expect(snapshot.items[0].unit_price).toBe(250)
  })

  it("uses after-discount item subtotal for commercial preview totals", () => {
    const calculationInput = toCommercialValuesCalculationInput(
      createMockOrder({
        items: [
          {
            adjustments: [{ amount: 10, code: "promo_10" }],
            discount_total: 10,
            id: "item_1",
            is_discountable: true,
            quantity: 1,
            subtotal: 100,
            tax_total: 18,
            unit_price: 100,
          },
        ],
        total: 108,
        version: 2,
      }),
      {
        expected_order_version: 2,
        items: [{ item_id: "item_1", unit_price: 100 }],
      }
    )

    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(preview.items[0].final_line_total).toBe(90)
    expect(preview.items[0].tax_total).toBe(18)
    expect(preview.new_total).toBe(108)
    expect(preview.delta).toBe(0)
  })

  it("preserves manual discounts when partial requests omit discount fields", () => {
    const calculationInput = toCommercialValuesCalculationInput(
      createMockOrder({
        items: [
          {
            adjustments: [
              { amount: 100, code: MANUAL_ITEM_DISCOUNT_CODE },
              { amount: 50, code: MANUAL_ORDER_DISCOUNT_CODE },
            ],
            id: "item_1",
            is_discountable: true,
            quantity: 1,
            unit_price: 1000,
          },
          {
            adjustments: [{ amount: 20, code: MANUAL_ITEM_DISCOUNT_CODE }],
            id: "item_2",
            is_discountable: true,
            quantity: 1,
            unit_price: 500,
          },
        ],
        total: 1330,
        version: 2,
      }),
      {
        expected_order_version: 2,
        items: [{ item_id: "item_2", unit_price: 600 }],
      }
    )

    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(preview.items[0].preserved_adjustment_amount).toBe(150)
    expect(preview.items[0].final_line_total).toBe(850)
    expect(preview.items[1].preserved_adjustment_amount).toBe(20)
    expect(preview.items[1].final_line_total).toBe(580)
    expect(preview.new_total).toBe(1430)
    expect(preview.delta).toBe(100)
  })

  it("rejects orders without a currency code", () => {
    expect(() =>
      toCommercialValuesSnapshot(createMockOrder({ currency_code: null }))
    ).toThrow("Order currency_code is missing")
  })

  it("uses semantic errors for editability blockers", () => {
    expect(() =>
      assertCommercialValuesEditable(createMockOrder({ status: "canceled" }))
    ).toThrow("Order status canceled is not editable")

    expect(() =>
      assertCommercialValuesEditable(createMockOrder(), {
        change_type: "edit",
        id: "oc_1",
        status: "requested",
        version: 1,
      })
    ).toThrow("Order already has active order change oc_1")

    expect(() =>
      assertCommercialValuesEditable(createMockOrder(), {
        change_type: "edit",
        id: "oc_2",
        status: "pending",
        version: 1,
      })
    ).not.toThrow()
  })
})
