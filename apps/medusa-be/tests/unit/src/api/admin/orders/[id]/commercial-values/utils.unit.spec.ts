import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import {
  assertCommercialValuesEditable,
  type CommercialValuesOrder,
  fetchCommercialValuesSnapshotOrder,
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

  it("uses pending edit preview items without dropping order fields", async () => {
    const order = createMockOrder()
    const query = {
      graph: vi.fn(async ({ entity }: { entity: string }) => {
        if (entity === "order") {
          return { data: [order] }
        }

        if (entity === "order_change") {
          return {
            data: [
              {
                change_type: "edit",
                id: "oc_1",
                status: "pending",
                version: 1,
              },
            ],
          }
        }

        return { data: [] }
      }),
    }
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === Modules.ORDER) {
          return {
            previewOrderChange: vi.fn(async () => ({
              id: "order_1",
              items: [
                {
                  detail: { quantity: 2 },
                  id: "item_1",
                },
              ],
            })),
          }
        }

        throw new Error(`Unexpected container key ${key}`)
      }),
    }

    const { activeOrderChange, order: snapshotOrder } =
      await fetchCommercialValuesSnapshotOrder(
        container as never,
        query as never,
        "order_1"
      )
    const snapshot = toCommercialValuesSnapshot(
      snapshotOrder,
      activeOrderChange
    )

    expect(snapshot.currency_code).toBe("czk")
    expect(snapshot.editable).toBe(true)
    expect(snapshot.expected_order_version).toBe(1)
    expect(snapshot.items[0]).toMatchObject({
      item_id: "item_1",
      quantity: 2,
      unit_price: 1000,
    })
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

  it("includes shipping methods as discountable commercial values", () => {
    const order = createMockOrder({
      shipping_methods: [
        {
          adjustments: [{ amount: 10, code: "carrier_promo" }],
          id: "ship_1",
          name: "Express",
          subtotal: 100,
          tax_total: 20,
        },
      ],
      total: 1120,
      version: 2,
    })
    const snapshot = toCommercialValuesSnapshot(order)

    expect(snapshot.shipping_methods[0]).toMatchObject({
      current_subtotal: 100,
      current_tax_total: 20,
      name: "Express",
      shipping_method_id: "ship_1",
    })

    const calculationInput = toCommercialValuesCalculationInput(order, {
      expected_order_version: 2,
      items: [{ item_id: "item_1", unit_price: 1000 }],
      shipping_methods: [
        {
          discount: { amount: 25, type: "amount" },
          shipping_method_id: "ship_1",
        },
      ],
    })
    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(preview.shipping_discount_total).toBe(25)
    expect(preview.shipping_methods[0].final_total).toBeCloseTo(
      69.166_666_666_666_67
    )
    expect(preview.shipping_methods[0]).toMatchObject({
      final_total_with_tax: 83,
      manual_shipping_discount_amount: 25,
      shipping_method_id: "ship_1",
    })
    expect(preview.shipping_methods[0].tax_total).toBeCloseTo(
      13.833_333_333_333_329
    )
    expect(preview.new_total).toBe(1083)
  })

  it("does not add tax twice for tax-inclusive unchanged items", () => {
    const calculationInput = toCommercialValuesCalculationInput(
      createMockOrder({
        items: [
          {
            id: "item_1",
            is_discountable: true,
            is_tax_inclusive: true,
            quantity: 1,
            subtotal: 6.902_439_024_390_244,
            tax_total: 1.587_560_975_609_756_2,
            total: 8.49,
            unit_price: 8.49,
          },
        ],
        shipping_methods: [
          {
            id: "ship_1",
            name: "Express",
            subtotal: 8.130_081_300_813_009,
            tax_total: 1.869_918_699_186_991_8,
          },
        ],
        total: 18.49,
      }),
      {
        expected_order_version: 1,
        items: [{ item_id: "item_1", unit_price: 8.49 }],
        shipping_methods: [
          {
            discount: { amount: 1, type: "amount" },
            shipping_method_id: "ship_1",
          },
        ],
      }
    )

    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(preview.items[0].final_line_total_with_tax).toBe(8.49)
    expect(preview.shipping_methods[0].final_total_with_tax).toBeCloseTo(9)
    expect(preview.new_total).toBeCloseTo(17.49)
  })

  it("allows amount discounts equal to displayed tax-inclusive item and shipping totals", () => {
    const order = createMockOrder({
      currency_code: "eur",
      items: [
        {
          id: "item_1",
          is_discountable: true,
          is_tax_inclusive: true,
          quantity: 1,
          subtotal: 6.902_439_024_390_244,
          tax_total: 1.587_560_975_609_756_2,
          total: 8.49,
          unit_price: 8.49,
        },
      ],
      shipping_methods: [
        {
          id: "ship_1",
          name: "Express",
          subtotal: 8.130_081_300_813_009,
          tax_total: 1.869_918_699_186_991_8,
        },
      ],
      total: 18.49,
    })

    const itemPreview = calculateCommercialValuesPreview(
      toCommercialValuesCalculationInput(order, {
        expected_order_version: 1,
        items: [
          {
            discount: { amount: 8.49, type: "amount" },
            item_id: "item_1",
            unit_price: 8.49,
          },
        ],
      })
    )
    const shippingPreview = calculateCommercialValuesPreview(
      toCommercialValuesCalculationInput(order, {
        expected_order_version: 1,
        items: [{ item_id: "item_1", unit_price: 8.49 }],
        shipping_methods: [
          {
            discount: { amount: 10, type: "amount" },
            shipping_method_id: "ship_1",
          },
        ],
      })
    )

    expect(itemPreview.items[0].final_line_total_with_tax).toBe(0)
    expect(itemPreview.new_total).toBeCloseTo(10)
    expect(shippingPreview.shipping_methods[0].final_total_with_tax).toBe(0)
    expect(shippingPreview.new_total).toBeCloseTo(8.49)
  })

  it("maps persisted taxable shipping adjustments back to displayed amounts", () => {
    const nativeShippingDiscount = 9 * (8.130_081_300_813_009 / 10)
    const order = createMockOrder({
      currency_code: "eur",
      items: [
        {
          adjustments: [
            {
              amount: 8.49,
              code: "manual_item_discount",
              item_id: "item_1",
            },
          ],
          id: "item_1",
          is_discountable: true,
          is_tax_inclusive: true,
          quantity: 1,
          subtotal: 6.902_439_024_390_244,
          tax_total: 1.587_560_975_609_756_2,
          total: 8.49,
          unit_price: 8.49,
        },
      ],
      shipping_methods: [
        {
          adjustments: [
            {
              amount: nativeShippingDiscount,
              code: "manual_shipping_discount",
              shipping_method_id: "ship_1",
              total: 9,
            },
          ],
          id: "ship_1",
          name: "Express",
          subtotal: 8.130_081_300_813_009,
          tax_total: 1.869_918_699_186_991_8,
        },
      ],
      total: 1,
    })
    const snapshot = toCommercialValuesSnapshot(order)
    const calculationInput = toCommercialValuesCalculationInput(order, {
      expected_order_version: 1,
      items: [{ item_id: "item_1", unit_price: 8.49 }],
    })
    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(snapshot.totals.current_total).toBe(1)
    expect(snapshot.totals.original_total).toBeCloseTo(18.49)
    expect(
      snapshot.shipping_methods[0].existing_adjustments[0].amount
    ).toBeCloseTo(9)
    expect(preview.new_total).toBeCloseTo(1)
  })

  it("reconstructs baseline totals for previously over-taxed shipping adjustments", () => {
    const order = createMockOrder({
      currency_code: "eur",
      items: [
        {
          adjustments: [
            {
              amount: 8.49,
              code: "manual_item_discount",
              item_id: "item_1",
              total: 8.49,
            },
          ],
          id: "item_1",
          is_discountable: true,
          is_tax_inclusive: true,
          quantity: 1,
          subtotal: 6.902_439_024_390_244,
          tax_total: 0,
          total: 0,
          unit_price: 8.49,
        },
      ],
      shipping_methods: [
        {
          adjustments: [
            {
              amount: 9,
              code: "manual_shipping_discount",
              shipping_method_id: "ship_1",
              total: 11.07,
            },
          ],
          amount: 10,
          id: "ship_1",
          name: "Express",
          subtotal: 8.130_081_300_813_009,
          tax_total: -0.200_081_300_813_008_12,
          total: -1.07,
        },
      ],
      total: -1.07,
    })
    const snapshot = toCommercialValuesSnapshot(order)

    expect(snapshot.totals.current_total).toBe(-1.07)
    expect(snapshot.totals.original_total).toBeCloseTo(18.49)
    expect(snapshot.shipping_methods[0].current_tax_total).toBeCloseTo(
      1.869_918_699_186_991_8
    )
    expect(
      snapshot.shipping_methods[0].existing_adjustments[0].amount
    ).toBeCloseTo(11.07)
  })

  it("allocates order discounts across items and shipping methods", () => {
    const calculationInput = toCommercialValuesCalculationInput(
      createMockOrder({
        shipping_methods: [
          {
            id: "ship_1",
            name: "Express",
            subtotal: 500,
            tax_total: 0,
          },
        ],
        total: 1500,
      }),
      {
        expected_order_version: 1,
        items: [{ item_id: "item_1", unit_price: 1000 }],
        order_discount: { amount: 150, type: "amount" },
      }
    )

    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(preview.items[0].manual_order_discount_amount).toBe(100)
    expect(preview.shipping_methods[0].manual_order_discount_amount).toBe(50)
    expect(preview.new_total).toBe(1350)
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
