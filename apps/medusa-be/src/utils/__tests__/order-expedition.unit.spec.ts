import { OrderStatus } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"
import {
  findMissingOrderIds,
  getOrderExpeditionDisplayId,
  ORDER_EXPEDITION_TARGET_STATUSES,
  orderMatchesExpeditionCarrier,
  orderOrdersByRequestedIds,
  resolveOrderExpeditionCarrier,
  toOrderExpeditionDto,
} from "../order-expedition"

describe("order expedition helpers", () => {
  it("keeps bulk status options aligned with Medusa order statuses", () => {
    expect(ORDER_EXPEDITION_TARGET_STATUSES).toEqual([
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
      })
    ).toMatchObject({ label: "PPL", value: "ppl" })

    expect(
      resolveOrderExpeditionCarrier({
        shipping_methods: [
          {
            data: {
              provider: "Zasilkovna",
              pickupPoint: "123",
            },
          },
        ],
      })
    ).toMatchObject({ label: "Packeta", value: "packeta" })
  })

  it("does not resolve carrier tokens from unrelated word substrings", () => {
    expect(
      resolveOrderExpeditionCarrier({
        shipping_methods: [{ name: "Supplied courier data" }],
      })
    ).toMatchObject({ label: "Other", value: "other" })
  })

  it("matches only the resolved carrier when a carrier filter is active", () => {
    const order = {
      shipping_methods: [{ shipping_option_id: "shipping-option-ppl-home" }],
    }

    expect(orderMatchesExpeditionCarrier(order, "ppl")).toBe(true)
    expect(orderMatchesExpeditionCarrier(order, "packeta")).toBe(false)
    expect(orderMatchesExpeditionCarrier(order)).toBe(true)
  })

  it("normalizes an order into the admin expedition DTO", () => {
    const dto = toOrderExpeditionDto({
      id: "order_1",
      display_id: 1001,
      custom_display_id: "#HERB-1001",
      email: "customer@example.com",
      status: "pending",
      payment_status: "captured",
      customer: {
        first_name: "Jana",
        last_name: "Novakova",
      },
      shipping_address: {
        address_1: "Ulice 1",
        city: "Praha",
        country_code: "cz",
        postal_code: "11000",
      },
      shipping_methods: [{ name: "Packeta Z-Point" }],
      payment_collections: [{ payments: [{ provider_id: "stripe" }] }],
      items: [{ id: "item_1", quantity: { value: "2" }, title: "Tea" }],
    })

    expect(dto).toMatchObject({
      carrier: { value: "packeta" },
      customer: "Jana Novakova",
      order_display_id: "#HERB-1001",
      payment_method: "stripe",
      status: "pending",
    })
    expect(dto.delivery_address).toEqual(["Ulice 1", "11000 Praha", "CZ"])
    expect(dto.items).toEqual([
      {
        id: "item_1",
        quantity: 2,
        sku: undefined,
        title: "Tea",
        variant: undefined,
      },
    ])
  })

  it("preserves selected order order and reports missing IDs", () => {
    const orders = [{ id: "order_2" }, { id: "order_1" }]

    expect(orderOrdersByRequestedIds(["order_1", "order_2"], orders)).toEqual([
      { id: "order_1" },
      { id: "order_2" },
    ])
    expect(findMissingOrderIds(["order_1", "order_3"], orders)).toEqual([
      "order_3",
    ])
  })

  it("falls back to stable display IDs", () => {
    expect(
      getOrderExpeditionDisplayId({ id: "order_1", display_id: 1001 })
    ).toBe("#1001")
    expect(
      getOrderExpeditionDisplayId({
        custom_display_id: "CZ-1001",
        display_id: 1001,
        id: "order_1",
      })
    ).toBe("CZ-1001")
  })
})
