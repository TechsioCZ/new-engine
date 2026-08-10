import type {
  IOrderModuleService,
  OrderPreviewDTO,
  Query,
} from "@medusajs/framework/types"
import {
  BigNumber,
  ContainerRegistrationKeys,
  createMedusaContainer,
  MedusaError,
  Modules,
  OrderChangeStatus,
} from "@medusajs/framework/utils"
import { asValue } from "awilix"
import { describe, expect, it, vi } from "vitest"

import {
  assertCommercialValuesEditable,
  fetchActiveOrderChange,
  fetchCommercialValuesSnapshotOrder,
  toCommercialValuesCalculationInput,
  toCommercialValuesSnapshot,
} from "../../../../../../../../src/api/admin/orders/[id]/commercial-values/utils"
import type { CommercialValuesOrder } from "../../../../../../../../src/api/admin/orders/[id]/commercial-values/utils"
import {
  calculateCommercialValuesPreview,
  MANUAL_ITEM_DISCOUNT_CODE,
  MANUAL_ORDER_DISCOUNT_CODE,
} from "../../../../../../../../src/utils/order-commercial-values"

const getRequired = <T>(values: readonly T[], index: number): T => {
  const value = values[index]
  expect(value).toBeDefined()
  if (value === undefined) {
    throw new Error(`Expected value at index ${index}`)
  }
  return value
}

const createMockOrder = (
  overrides: Partial<CommercialValuesOrder> = {},
): CommercialValuesOrder => {
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
    status: OrderChangeStatus.PENDING,
    total: 1000,
    version: 1,
  }

  return {
    ...baseOrder,
    ...overrides,
    ...(overrides.items === undefined ? {} : { items: overrides.items }),
  }
}

class FixtureReference<T> {
  #value: T | undefined

  get() {
    if (this.#value === undefined) {
      throw new Error("Fixture reference was read before initialization")
    }

    return this.#value
  }

  set(value: T) {
    this.#value = value
  }
}

const unavailableExpandedRelation = (relation: string): never => {
  throw new Error(`The ${relation} relation is not expanded in this fixture`)
}

const createOrderPreviewFixture = (): OrderPreviewDTO => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z")
  const rawZero = { value: 0 }
  const rawQuantity = { value: 2 }
  const rawUnitPrice = { value: 1000 }
  const previewReference = new FixtureReference<OrderPreviewDTO>()
  const previewItemReference = new FixtureReference<
    OrderPreviewDTO["items"][number]
  >()

  const previewItem: OrderPreviewDTO["items"][number] = {
    created_at: createdAt,
    detail: {
      created_at: createdAt,
      delivered_quantity: 0,
      fulfilled_quantity: 0,
      id: "order-item_1",
      get item() {
        return previewItemReference.get()
      },
      item_id: "item_1",
      metadata: null,
      quantity: 2,
      raw_delivered_quantity: rawZero,
      raw_fulfilled_quantity: rawZero,
      raw_quantity: rawQuantity,
      raw_return_dismissed_quantity: rawZero,
      raw_return_received_quantity: rawZero,
      raw_return_requested_quantity: rawZero,
      raw_shipped_quantity: rawZero,
      raw_written_off_quantity: rawZero,
      return_dismissed_quantity: 0,
      return_received_quantity: 0,
      return_requested_quantity: 0,
      shipped_quantity: 0,
      updated_at: createdAt,
      written_off_quantity: 0,
    },
    discount_tax_total: 0,
    discount_total: 0,
    id: "item_1",
    is_discountable: true,
    is_giftcard: false,
    is_tax_inclusive: false,
    item_subtotal: 2000,
    item_tax_total: 0,
    item_total: 2000,
    original_subtotal: 2000,
    original_tax_total: 0,
    original_total: 2000,
    quantity: 2,
    raw_discount_tax_total: rawZero,
    raw_discount_total: rawZero,
    raw_item_subtotal: { value: 2000 },
    raw_item_tax_total: rawZero,
    raw_item_total: { value: 2000 },
    raw_original_subtotal: { value: 2000 },
    raw_original_tax_total: rawZero,
    raw_original_total: { value: 2000 },
    raw_quantity: rawQuantity,
    raw_refundable_total: { value: 2000 },
    raw_refundable_total_per_unit: rawUnitPrice,
    raw_subtotal: { value: 2000 },
    raw_tax_total: rawZero,
    raw_total: { value: 2000 },
    raw_unit_price: rawUnitPrice,
    refundable_total: 2000,
    refundable_total_per_unit: 1000,
    requires_shipping: true,
    return_requested_total: 0,
    subtotal: 2000,
    tax_total: 0,
    title: "Preview item",
    total: 2000,
    unit_price: 1000,
    updated_at: createdAt,
  }

  previewItemReference.set(previewItem)

  const orderChange: OrderPreviewDTO["order_change"] = {
    actions: [],
    canceled_at: null,
    canceled_by: null,
    change_type: "edit",
    get claim() {
      return unavailableExpandedRelation("order change claim")
    },
    claim_id: "",
    confirmed_at: null,
    confirmed_by: null,
    created_at: createdAt,
    declined_at: null,
    declined_by: null,
    declined_reason: null,
    get exchange() {
      return unavailableExpandedRelation("order change exchange")
    },
    exchange_id: "",
    id: "oc_1",
    metadata: null,
    get order() {
      return previewReference.get()
    },
    order_id: "order_1",
    requested_at: null,
    requested_by: null,
    return_id: "",
    return_order: {
      display_id: 1,
      id: "return_1",
      items: [],
      metadata: null,
      order_id: "order_1",
      status: "requested",
    },
    status: OrderChangeStatus.PENDING,
    updated_at: createdAt,
    version: 1,
  }

  const preview: OrderPreviewDTO = {
    created_at: createdAt,
    credit_line_total: 0,
    currency_code: "czk",
    discount_subtotal: 0,
    discount_tax_total: 0,
    discount_total: 0,
    display_id: 1,
    gift_card_tax_total: 0,
    gift_card_total: 0,
    id: "order_1",
    item_discount_total: 0,
    item_subtotal: 2000,
    item_tax_total: 0,
    item_total: 2000,
    items: [previewItem],
    order_change: orderChange,
    original_item_subtotal: 2000,
    original_item_tax_total: 0,
    original_item_total: 2000,
    original_shipping_subtotal: 0,
    original_shipping_tax_total: 0,
    original_shipping_total: 0,
    original_subtotal: 2000,
    original_tax_total: 0,
    original_total: 2000,
    raw_credit_line_total: rawZero,
    raw_discount_tax_total: rawZero,
    raw_discount_total: rawZero,
    raw_gift_card_tax_total: rawZero,
    raw_gift_card_total: rawZero,
    raw_item_subtotal: { value: 2000 },
    raw_item_tax_total: rawZero,
    raw_item_total: { value: 2000 },
    raw_original_item_subtotal: { value: 2000 },
    raw_original_item_tax_total: rawZero,
    raw_original_item_total: { value: 2000 },
    raw_original_shipping_subtotal: rawZero,
    raw_original_shipping_tax_total: rawZero,
    raw_original_shipping_total: rawZero,
    raw_original_subtotal: { value: 2000 },
    raw_original_tax_total: rawZero,
    raw_original_total: { value: 2000 },
    raw_shipping_subtotal: rawZero,
    raw_shipping_tax_total: rawZero,
    raw_shipping_total: rawZero,
    raw_subtotal: { value: 2000 },
    raw_tax_total: rawZero,
    raw_total: { value: 2000 },
    return_requested_total: 0,
    shipping_discount_total: 0,
    shipping_methods: [],
    shipping_subtotal: 0,
    shipping_tax_total: 0,
    shipping_total: 0,
    status: OrderChangeStatus.PENDING,
    subtotal: 2000,
    tax_total: 0,
    total: 2000,
    updated_at: createdAt,
    version: 1,
  }

  previewReference.set(preview)

  return preview
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
      }),
    )

    expect(snapshot.totals.current_total).toBe(19.49)
    expect(getRequired(snapshot.items, 0).quantity).toBe(1.5)
    expect(getRequired(snapshot.items, 0).unit_price).toBe(19.99)
    expect(
      getRequired(getRequired(snapshot.items, 0).existing_adjustments, 0)
        .amount,
    ).toBe(0.5)
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
      }),
    )

    expect(getRequired(snapshot.items, 0)).toMatchObject({
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
        status: OrderChangeStatus.PENDING,
        version: 1,
      },
    )

    expect(snapshot.edit_blockers).toStrictEqual([
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
      status: OrderChangeStatus.PENDING,
      version: 1,
    })

    expect(snapshot.editable).toBeTruthy()
    expect(snapshot.edit_blockers).toStrictEqual([])
  })

  it("returns no active order change only when the graph row is absent", async () => {
    const graph = vi.fn<Query["graph"]>().mockResolvedValue({ data: [] })
    const container = createMedusaContainer()
    container.register({
      [ContainerRegistrationKeys.QUERY]: asValue({ graph }),
    })
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    await expect(
      fetchActiveOrderChange(query, "order_1"),
    ).resolves.toBeUndefined()
  })

  it("rejects an unexpected active order change status as invalid data", async () => {
    const graph = vi.fn<Query["graph"]>().mockResolvedValue({
      data: [
        {
          change_type: "edit",
          id: "oc_1",
          status: "completed",
          version: 1,
        },
      ],
    })
    const container = createMedusaContainer()
    container.register({
      [ContainerRegistrationKeys.QUERY]: asValue({ graph }),
    })
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    await expect(
      fetchActiveOrderChange(query, "order_1"),
    ).rejects.toMatchObject({
      message: "Order change query returned invalid order change data",
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("uses pending edit preview items without dropping order fields", async () => {
    const order = createMockOrder()
    const graph = vi.fn<Query["graph"]>()
    graph.mockResolvedValueOnce({ data: [order] }).mockResolvedValueOnce({
      data: [
        {
          change_type: "edit",
          id: "oc_1",
          status: OrderChangeStatus.PENDING,
          version: 1,
        },
      ],
    })
    const previewOrderChange = vi
      .fn<IOrderModuleService["previewOrderChange"]>()
      .mockResolvedValue(createOrderPreviewFixture())
    const container = createMedusaContainer()
    container.register({
      [ContainerRegistrationKeys.QUERY]: asValue({ graph }),
      [Modules.ORDER]: asValue({ previewOrderChange }),
    })
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const { activeOrderChange, order: snapshotOrder } =
      await fetchCommercialValuesSnapshotOrder(container, query, "order_1")
    const snapshot = toCommercialValuesSnapshot(
      snapshotOrder,
      activeOrderChange,
    )

    expect(previewOrderChange).toHaveBeenCalledWith("order_1")
    expect(snapshot.currency_code).toBe("czk")
    expect(snapshot.editable).toBeTruthy()
    expect(snapshot.expected_order_version).toBe(1)
    expect(getRequired(snapshot.items, 0)).toMatchObject({
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
      }),
    )

    expect(getRequired(snapshot.items, 0).unit_price).toBe(250)
    expect(getRequired(snapshot.items, 0).original_unit_price).toBe(250)
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
      }),
    )

    expect(getRequired(snapshot.items, 0).quantity).toBe(2)
    expect(getRequired(snapshot.items, 0).unit_price).toBe(250)
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
      }),
    )

    expect(getRequired(snapshot.items, 0).quantity).toBe(2)
    expect(getRequired(snapshot.items, 0).unit_price).toBe(250)
  })

  it("reads Medusa BigNumber-like amount objects from query graph", () => {
    const snapshot = toCommercialValuesSnapshot(
      createMockOrder({
        items: [
          {
            id: "item_1",
            is_discountable: true,
            quantity: new BigNumber("2"),
            unit_price: new BigNumber("250"),
          },
        ],
        total: 500,
      }),
    )

    expect(getRequired(snapshot.items, 0).quantity).toBe(2)
    expect(getRequired(snapshot.items, 0).unit_price).toBe(250)
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
      },
    )

    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(getRequired(preview.items, 0).final_line_total).toBe(90)
    expect(getRequired(preview.items, 0).tax_total).toBe(18)
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
      },
    )

    const preview = calculateCommercialValuesPreview(calculationInput)

    expect({
      delta: preview.delta,
      firstFinalTotal: getRequired(preview.items, 0).final_line_total,
      firstPreservedAdjustment: getRequired(preview.items, 0)
        .preserved_adjustment_amount,
      newTotal: preview.new_total,
      secondFinalTotal: getRequired(preview.items, 1).final_line_total,
      secondPreservedAdjustment: getRequired(preview.items, 1)
        .preserved_adjustment_amount,
    }).toStrictEqual({
      delta: 100,
      firstFinalTotal: 850,
      firstPreservedAdjustment: 150,
      newTotal: 1430,
      secondFinalTotal: 580,
      secondPreservedAdjustment: 20,
    })
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

    expect(getRequired(snapshot.shipping_methods, 0)).toMatchObject({
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

    const shippingPreview = getRequired(preview.shipping_methods, 0)
    expect(shippingPreview.final_total).toBeCloseTo(69.16666666666667)
    expect(shippingPreview.tax_total).toBeCloseTo(13.833333333333329)
    expect({
      finalTotalWithTax: shippingPreview.final_total_with_tax,
      manualDiscount: shippingPreview.manual_shipping_discount_amount,
      newTotal: preview.new_total,
      shippingDiscountTotal: preview.shipping_discount_total,
      shippingMethodId: shippingPreview.shipping_method_id,
    }).toStrictEqual({
      finalTotalWithTax: 83,
      manualDiscount: 25,
      newTotal: 1083,
      shippingDiscountTotal: 25,
      shippingMethodId: "ship_1",
    })
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
            subtotal: 6.902439024390244,
            tax_total: 1.5875609756097562,
            total: 8.49,
            unit_price: 8.49,
          },
        ],
        shipping_methods: [
          {
            id: "ship_1",
            name: "Express",
            subtotal: 8.130081300813009,
            tax_total: 1.8699186991869918,
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
      },
    )

    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(getRequired(preview.items, 0).final_line_total_with_tax).toBe(8.49)
    expect(
      getRequired(preview.shipping_methods, 0).final_total_with_tax,
    ).toBeCloseTo(9)
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
          subtotal: 6.902439024390244,
          tax_total: 1.5875609756097562,
          total: 8.49,
          unit_price: 8.49,
        },
      ],
      shipping_methods: [
        {
          id: "ship_1",
          name: "Express",
          subtotal: 8.130081300813009,
          tax_total: 1.8699186991869918,
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
      }),
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
      }),
    )

    expect(getRequired(itemPreview.items, 0).final_line_total_with_tax).toBe(0)
    expect(itemPreview.new_total).toBeCloseTo(10)
    expect(
      getRequired(shippingPreview.shipping_methods, 0).final_total_with_tax,
    ).toBe(0)
    expect(shippingPreview.new_total).toBeCloseTo(8.49)
  })

  it("maps persisted taxable shipping adjustments back to displayed amounts", () => {
    const nativeShippingDiscount = 9 * (8.130081300813009 / 10)
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
          subtotal: 6.902439024390244,
          tax_total: 1.5875609756097562,
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
          subtotal: 8.130081300813009,
          tax_total: 1.8699186991869918,
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
      getRequired(
        getRequired(snapshot.shipping_methods, 0).existing_adjustments,
        0,
      ).amount,
    ).toBeCloseTo(9)
    expect(preview.new_total).toBeCloseTo(1)
  })

  it("parses persisted manual discount intent from adjustment descriptions", () => {
    const snapshot = toCommercialValuesSnapshot(
      createMockOrder({
        items: [
          {
            adjustments: [
              {
                amount: 90,
                code: "manual_item_discount",
                description:
                  'Manual item discount [cv_discount:{"type":"percentage","value_bps":9000}]',
                item_id: "item_1",
              },
            ],
            id: "item_1",
            is_discountable: true,
            quantity: 1,
            unit_price: 1000,
          },
        ],
      }),
    )

    expect(
      getRequired(getRequired(snapshot.items, 0).existing_adjustments, 0)
        .discount_intent,
    ).toStrictEqual({
      type: "percentage",
      value_bps: 9000,
    })
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
          subtotal: 6.902439024390244,
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
          subtotal: 8.130081300813009,
          tax_total: -0.20008130081300812,
          total: -1.07,
        },
      ],
      total: -1.07,
    })
    const snapshot = toCommercialValuesSnapshot(order)
    const calculationInput = toCommercialValuesCalculationInput(order, {
      expected_order_version: 1,
      items: [
        {
          discount: { amount: 8.49, type: "amount" },
          item_id: "item_1",
          unit_price: 8.49,
        },
      ],
      shipping_methods: [
        {
          discount: { amount: 9, type: "amount" },
          shipping_method_id: "ship_1",
        },
      ],
    })
    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(snapshot.totals.current_total).toBe(-1.07)
    expect(snapshot.totals.original_total).toBeCloseTo(18.49)
    expect(
      getRequired(snapshot.shipping_methods, 0).current_tax_total,
    ).toBeCloseTo(1.8699186991869918)
    expect(
      getRequired(
        getRequired(snapshot.shipping_methods, 0).existing_adjustments,
        0,
      ).amount,
    ).toBeCloseTo(11.07)
    expect(preview.new_total).toBeCloseTo(1)
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
      },
    )

    const preview = calculateCommercialValuesPreview(calculationInput)

    expect(getRequired(preview.items, 0).manual_order_discount_amount).toBe(100)
    expect(
      getRequired(preview.shipping_methods, 0).manual_order_discount_amount,
    ).toBe(50)
    expect(preview.new_total).toBe(1350)
  })

  it("rejects orders without a currency code", () => {
    expect(() =>
      toCommercialValuesSnapshot(createMockOrder({ currency_code: null })),
    ).toThrow("Order currency_code is missing")
  })

  it("uses semantic errors for editability blockers", () => {
    expect(() => {
      assertCommercialValuesEditable(createMockOrder({ status: "canceled" }))
    }).toThrow("Order status canceled is not editable")

    expect(() => {
      assertCommercialValuesEditable(createMockOrder(), {
        change_type: "edit",
        id: "oc_1",
        status: OrderChangeStatus.REQUESTED,
        version: 1,
      })
    }).toThrow("Order already has active order change oc_1")

    expect(() => {
      assertCommercialValuesEditable(createMockOrder(), {
        change_type: "edit",
        id: "oc_2",
        status: OrderChangeStatus.PENDING,
        version: 1,
      })
    }).not.toThrow()
  })
})
