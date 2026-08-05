import { OrderStatus } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"

import {
  findMissingOrderIds,
  getOrderExpeditionDisplayId,
  getOrderExpeditionTransitionBlockReason,
  ORDER_EXPEDITION_TARGET_STATUSES,
  orderMatchesExpeditionCarrier,
  orderOrdersByRequestedIds,
  resolveOrderExpeditionCarrier,
  toOrderExpeditionDto,
} from "../../../../src/utils/order-expedition"

describe("order expedition helpers", () => {
  it("keeps bulk status options aligned with Medusa order statuses", () => {
    expect(ORDER_EXPEDITION_TARGET_STATUSES).toStrictEqual([
      OrderStatus.PENDING,
      OrderStatus.COMPLETED,
      OrderStatus.DRAFT,
      OrderStatus.ARCHIVED,
      OrderStatus.CANCELED,
      OrderStatus.REQUIRES_ACTION,
    ])
  })

  it("resolves carriers from shipping method names and data before fulfillment exists", () => {
    expect(
      resolveOrderExpeditionCarrier({
        shipping_methods: [{ name: "PPL ParcelShop" }],
      }),
    ).toMatchObject({ label: "PPL", value: "ppl" })

    expect(
      resolveOrderExpeditionCarrier({
        shipping_methods: [
          {
            data: {
              pickupPoint: "123",
              provider: "Zasilkovna",
            },
          },
        ],
      }),
    ).toMatchObject({ label: "Packeta", value: "packeta" })

    expect(
      resolveOrderExpeditionCarrier({
        shipping_methods: [{ name: "GLS ParcelShop" }],
      }),
    ).toMatchObject({ label: "GLS", value: "gls" })
  })

  it("does not resolve carrier tokens from unrelated word substrings", () => {
    expect(
      resolveOrderExpeditionCarrier({
        shipping_methods: [{ name: "Supplied courier data" }],
      }),
    ).toMatchObject({ label: "Other", value: "other" })
  })

  it("matches only the resolved carrier when a carrier filter is active", () => {
    const order = {
      shipping_methods: [{ shipping_option_id: "shipping-option-ppl-home" }],
    }

    expect(orderMatchesExpeditionCarrier(order, "ppl")).toBeTruthy()
    expect(orderMatchesExpeditionCarrier(order, "packeta")).toBeFalsy()
    expect(orderMatchesExpeditionCarrier(order)).toBeTruthy()
  })

  it("normalizes an order into the admin expedition DTO", () => {
    const dto = toOrderExpeditionDto({
      custom_display_id: "#HERB-1001",
      customer: {
        first_name: "Jana",
        last_name: "Novakova",
      },
      display_id: 1001,
      email: "customer@example.com",
      id: "order_1",
      items: [{ id: "item_1", quantity: { value: "2" }, title: "Tea" }],
      payment_collections: [{ payments: [{ provider_id: "stripe" }] }],
      payment_status: "captured",
      shipping_address: {
        address_1: "Ulice 1",
        city: "Praha",
        country_code: "cz",
        postal_code: "11000",
      },
      shipping_methods: [{ name: "Packeta Z-Point" }],
      status: "pending",
      summary: [{ totals: { current_order_total: 47.39 }, version: 1 }],
      total: 0,
    })

    expect(dto).toMatchObject({
      carrier: { value: "packeta" },
      customer: "Jana Novakova",
      has_active_fulfillment: false,
      order_display_id: "#HERB-1001",
      payment_method: "stripe",
      status: "pending",
      total: 47.39,
    })
    expect(dto.delivery_address).toStrictEqual(["Ulice 1", "11000 Praha", "CZ"])
    expect(dto.items).toStrictEqual([
      {
        id: "item_1",
        quantity: 2,
        sku: undefined,
        thumbnail: undefined,
        title: "Tea",
        unit_price: null,
        variant: undefined,
        variant_id: undefined,
      },
    ])
  })

  it("uses the latest summary total when query returns a zero order total", () => {
    const dto = toOrderExpeditionDto({
      display_id: 1001,
      id: "order_1",
      summary: [
        {
          totals: {
            current_order_total: 50,
            original_order_total: 60,
          },
          version: 1,
        },
        {
          totals: {
            current_order_total: 47.39,
            original_order_total: 60,
          },
          version: 2,
        },
      ],
      total: 0,
    })

    expect(dto.total).toBe(47.39)
  })

  it("uses raw summary totals when scalar summary totals are zeroed", () => {
    const dto = toOrderExpeditionDto({
      display_id: 1001,
      id: "order_1",
      summary: [
        {
          current_order_total: 0,
          raw_current_order_total: { value: "47.390000000000000000" },
          version: 1,
        },
      ],
      total: 0,
    })

    expect(dto.total).toBe("47.390000000000000000")
  })

  it("keeps a zero order total when summary data is missing", () => {
    const dto = toOrderExpeditionDto({
      display_id: 1001,
      id: "order_1",
      total: 0,
    })

    expect(dto.total).toBe(0)
  })

  it("keeps a non-zero order total over a summary total", () => {
    const dto = toOrderExpeditionDto({
      display_id: 1001,
      id: "order_1",
      summary: [{ totals: { current_order_total: 47.39 }, version: 1 }],
      total: 12.34,
    })

    expect(dto.total).toBe(12.34)
  })

  it("keeps a non-zero order total when summary total is zero", () => {
    const dto = toOrderExpeditionDto({
      display_id: 1001,
      id: "order_1",
      summary: [{ totals: { current_order_total: 0 }, version: 1 }],
      total: 12.34,
    })

    expect(dto.total).toBe(12.34)
  })

  it("returns zero when summary total and order total are zero", () => {
    const dto = toOrderExpeditionDto({
      display_id: 1001,
      id: "order_1",
      summary: [{ totals: { current_order_total: 0 }, version: 1 }],
      total: 0,
    })

    expect(dto.total).toBe(0)
  })

  it("falls back to a non-zero order total when summary data is missing", () => {
    const dto = toOrderExpeditionDto({
      display_id: 1001,
      id: "order_1",
      total: 12.34,
    })

    expect(dto.total).toBe(12.34)
  })

  it("normalizes Medusa amount objects returned by the query layer", () => {
    const dto = toOrderExpeditionDto({
      display_id: 1001,
      id: "order_1",
      total: { valueOf: () => "47.390000000000000000" },
    })

    expect(dto.total).toBe("47.390000000000000000")
  })

  it("explains expedition status transition blockers", () => {
    expect(
      getOrderExpeditionTransitionBlockReason(
        { fulfillments: [], status: "pending" },
        "archived",
      ),
    ).toBe("Pending orders cannot be changed to archived")
    expect(
      getOrderExpeditionTransitionBlockReason(
        { fulfillments: [], status: "canceled" },
        "archived",
      ),
    ).toBeUndefined()
    expect(
      getOrderExpeditionTransitionBlockReason(
        {
          fulfillments: [{ canceled_at: null, id: "ful_1" }],
          status: "pending",
        },
        "canceled",
      ),
    ).toBe("Orders with active fulfillments cannot be canceled")
  })

  it("preserves selected order order and reports missing IDs", () => {
    const orders = [{ id: "order_2" }, { id: "order_1" }]

    expect(
      orderOrdersByRequestedIds(["order_1", "order_2"], orders),
    ).toStrictEqual([{ id: "order_1" }, { id: "order_2" }])
    expect(findMissingOrderIds(["order_1", "order_3"], orders)).toStrictEqual([
      "order_3",
    ])
  })

  it("falls back to stable display IDs", () => {
    expect(
      getOrderExpeditionDisplayId({ display_id: 1001, id: "order_1" }),
    ).toBe("#1001")
    expect(
      getOrderExpeditionDisplayId({
        custom_display_id: "CZ-1001",
        display_id: 1001,
        id: "order_1",
      }),
    ).toBe("CZ-1001")
  })
})
