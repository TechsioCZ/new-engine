import { MedusaError } from "@medusajs/framework/utils"

import {
  type CommercialValuesCalculationInput,
  type CommercialValuesItemInput,
  CommercialValuesValidationError,
  calculateCommercialValuesPreview,
  getPreservedAdjustmentAmount,
  MANUAL_ITEM_DISCOUNT_CODE,
} from "../../../../src/utils/order-commercial-values"

function createItem(
  overrides: Partial<CommercialValuesItemInput> = {}
): CommercialValuesItemInput {
  return {
    item_id: "item_1",
    original_unit_price: 1000,
    quantity: 1,
    unit_price: 1000,
    ...overrides,
  }
}

function createBaseInput(
  overrides: Partial<CommercialValuesCalculationInput> = {}
): CommercialValuesCalculationInput {
  const baseInput: CommercialValuesCalculationInput = {
    currency_code: "czk",
    expected_order_version: 1,
    items: [createItem()],
    order_id: "order_1",
    original_total: 1000,
  }

  return {
    ...baseInput,
    ...overrides,
    items: overrides.items ?? baseInput.items,
  }
}

describe("order commercial values", () => {
  it("applies item discounts before allocating the order discount", () => {
    const preview = calculateCommercialValuesPreview(
      createBaseInput({
        items: [
          createItem({ discount: { type: "percentage", value_bps: 1000 } }),
          createItem({
            discount: { amount: 200, type: "amount" },
            item_id: "item_2",
            original_unit_price: 2000,
            unit_price: 2000,
          }),
        ],
        order_discount: { type: "percentage", value_bps: 1000 },
        original_total: 3000,
      })
    )

    expect(preview.item_subtotal_after_item_discounts).toBe(2700)
    expect(preview.order_discount_total).toBe(270)
    expect(preview.new_total).toBe(2430)
    expect(preview.delta).toBe(-570)
  })

  it("allocates one-unit remainders deterministically", () => {
    const preview = calculateCommercialValuesPreview(
      createBaseInput({
        items: [
          createItem({ original_unit_price: 100, unit_price: 100 }),
          createItem({
            item_id: "item_2",
            original_unit_price: 100,
            unit_price: 100,
          }),
          createItem({
            item_id: "item_3",
            original_unit_price: 100,
            unit_price: 100,
          }),
        ],
        order_discount: { amount: 1, type: "amount" },
        original_total: 300,
      })
    )

    expect(
      preview.items.map((item) => item.manual_order_discount_amount)
    ).toEqual([1, 0, 0])
    expect(preview.new_total).toBe(299)
  })

  it("accepts fractional currency amounts", () => {
    const preview = calculateCommercialValuesPreview(
      createBaseInput({
        currency_code: "eur",
        items: [
          createItem({
            discount: { amount: 0.99, type: "amount" },
            existing_adjustments: [{ amount: 0.5, code: "promo_50" }],
            original_unit_price: 19.99,
            unit_price: 19.99,
          }),
        ],
        original_total: 19.49,
      })
    )

    expect(preview.items[0].preserved_adjustment_amount).toBe(0.5)
    expect(preview.items[0].manual_item_discount_amount).toBe(0.99)
    expect(preview.new_total).toBeCloseTo(18.5)
  })

  it("accepts fractional item quantities", () => {
    const preview = calculateCommercialValuesPreview(
      createBaseInput({
        items: [
          createItem({
            original_unit_price: 100,
            quantity: 1.5,
            unit_price: 120,
          }),
        ],
        original_total: 150,
      })
    )

    expect(preview.items[0].line_base).toBe(180)
    expect(preview.items[0].quantity).toBe(1.5)
    expect(preview.new_total).toBe(180)
  })

  it("preserves non-owned adjustments and ignores owned manual adjustments", () => {
    const preserved = getPreservedAdjustmentAmount([
      { amount: 50, code: "promo_10" },
      { amount: 20, code: MANUAL_ITEM_DISCOUNT_CODE },
      { amount: 30 },
    ])

    expect(preserved).toBe(80)
  })

  it("uses all current adjustments when preserving the non-item total component", () => {
    const preview = calculateCommercialValuesPreview(
      createBaseInput({
        items: [
          createItem({
            existing_adjustments: [
              { amount: 100, code: MANUAL_ITEM_DISCOUNT_CODE },
            ],
          }),
        ],
        original_total: 900,
      })
    )

    expect(preview.new_total).toBe(1000)
    expect(preview.delta).toBe(100)
  })

  it("recalculates item tax totals in the preview total", () => {
    const preview = calculateCommercialValuesPreview(
      createBaseInput({
        items: [
          createItem({
            current_subtotal: 100,
            current_tax_total: 20,
            original_unit_price: 100,
            unit_price: 200,
          }),
        ],
        original_total: 120,
      })
    )

    expect(preview.items[0].final_line_total).toBe(200)
    expect(preview.items[0].tax_total).toBe(40)
    expect(preview.items[0].final_line_total_with_tax).toBe(240)
    expect(preview.new_total).toBe(240)
    expect(preview.delta).toBe(120)
  })

  it("applies an absolute order discount after item discounts", () => {
    const preview = calculateCommercialValuesPreview(
      createBaseInput({
        items: [
          createItem({ discount: { type: "percentage", value_bps: 1000 } }),
          createItem({
            discount: { amount: 200, type: "amount" },
            item_id: "item_2",
            original_unit_price: 2000,
            unit_price: 2000,
          }),
        ],
        order_discount: { amount: 300, type: "amount" },
        original_total: 3000,
      })
    )

    expect(preview.item_subtotal_after_item_discounts).toBe(2700)
    expect(preview.order_discount_total).toBe(300)
    expect(preview.new_total).toBe(2400)
  })

  it("does not allocate order discounts to non-discountable lines", () => {
    const preview = calculateCommercialValuesPreview(
      createBaseInput({
        items: [
          createItem({ is_discountable: false }),
          createItem({
            item_id: "item_2",
            original_unit_price: 2000,
            unit_price: 2000,
          }),
        ],
        order_discount: { amount: 200, type: "amount" },
        original_total: 3000,
      })
    )

    expect(preview.items[0].manual_order_discount_amount).toBe(0)
    expect(preview.items[1].manual_order_discount_amount).toBe(200)
    expect(preview.new_total).toBe(2800)
  })

  it.each([
    [
      "item amount discount above the line base",
      createBaseInput({
        items: [createItem({ discount: { amount: 1001, type: "amount" } })],
      }),
    ],
    [
      "percentage above 100 percent",
      createBaseInput({
        items: [
          createItem({
            discount: { type: "percentage", value_bps: 10_001 },
          }),
        ],
      }),
    ],
    [
      "order amount discount above the eligible subtotal",
      createBaseInput({
        order_discount: { amount: 1001, type: "amount" },
      }),
    ],
    [
      "order discount with no eligible lines",
      createBaseInput({
        items: [createItem({ is_discountable: false })],
        order_discount: { amount: 1, type: "amount" },
      }),
    ],
    [
      "item discount on a non-discountable line",
      createBaseInput({
        items: [
          createItem({
            discount: { amount: 1, type: "amount" },
            is_discountable: false,
          }),
        ],
      }),
    ],
  ])("rejects %s", (_label, input) => {
    expect(() => calculateCommercialValuesPreview(input)).toThrow(
      CommercialValuesValidationError
    )
  })

  it("maps validation failures to Medusa invalid-data errors", () => {
    try {
      calculateCommercialValuesPreview(
        createBaseInput({
          items: [createItem({ unit_price: -1 })],
        })
      )
    } catch (error) {
      expect(error).toBeInstanceOf(CommercialValuesValidationError)
      expect(error).toBeInstanceOf(MedusaError)
      expect((error as CommercialValuesValidationError).code).toBe(
        "unit_price_invalid"
      )
      expect((error as MedusaError).type).toBe(MedusaError.Types.INVALID_DATA)

      return
    }

    throw new Error("Expected commercial values validation to fail")
  })
})
