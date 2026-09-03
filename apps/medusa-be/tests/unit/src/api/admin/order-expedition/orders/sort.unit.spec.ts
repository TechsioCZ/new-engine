import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"
import {
  getNativeOrderExpeditionSort,
  isNativeOrderExpeditionSort,
  parseOrderExpeditionSort,
  sortOrderExpeditionOrders,
} from "../../../../../../../src/api/admin/order-expedition/orders/sort"
import type { OrderExpeditionRawOrder } from "../../../../../../../src/utils/order-expedition"

describe("order expedition sorting", () => {
  it("parses the default and explicit sort directions", () => {
    expect(parseOrderExpeditionSort(undefined)).toEqual({
      direction: "DESC",
      field: "created_at",
      query: "-created_at",
    })
    expect(parseOrderExpeditionSort("customer")).toEqual({
      direction: "ASC",
      field: "customer",
      query: "customer",
    })
  })

  it("rejects unsupported sort fields with a client-safe error", () => {
    expect(() => parseOrderExpeditionSort("unsupported" as never)).toThrow(
      expect.objectContaining({ type: MedusaError.Types.INVALID_DATA })
    )
  })

  it("recognizes native sorts and builds stable native pagination order", () => {
    const nativeSort = parseOrderExpeditionSort("display_id")

    expect(isNativeOrderExpeditionSort(nativeSort)).toBe(true)
    expect(getNativeOrderExpeditionSort(nativeSort)).toEqual({
      display_id: "ASC",
      id: "ASC",
    })
    expect(
      isNativeOrderExpeditionSort(parseOrderExpeditionSort("customer"))
    ).toBe(false)
  })

  it("sorts derived customer values and uses the order id as a tiebreaker", () => {
    const orders: OrderExpeditionRawOrder[] = [
      {
        id: "order_3",
        customer: { first_name: "Beta", last_name: "Customer" },
      },
      {
        id: "order_2",
        customer: { first_name: "Alpha", last_name: "Customer" },
      },
      {
        id: "order_1",
        customer: { first_name: "Alpha", last_name: "Customer" },
      },
    ]

    expect(
      sortOrderExpeditionOrders(
        orders,
        parseOrderExpeditionSort("customer")
      ).map(({ id }) => id)
    ).toEqual(["order_1", "order_2", "order_3"])
  })

  it("sorts valid creation dates and keeps missing dates last", () => {
    const orders: OrderExpeditionRawOrder[] = [
      { id: "order_missing" },
      { created_at: "2026-08-11T10:00:00.000Z", id: "order_new" },
      { created_at: "2026-08-10T10:00:00.000Z", id: "order_old" },
    ]

    expect(
      sortOrderExpeditionOrders(
        orders,
        parseOrderExpeditionSort("created_at")
      ).map(({ id }) => id)
    ).toEqual(["order_old", "order_new", "order_missing"])
  })
})
