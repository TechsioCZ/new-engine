import { describe, expect, it } from "vitest"
import { ORDER_BUSINESS_STATUS_METADATA_KEY } from "../../../../utils/order-business-status"
import {
  buildOrderBusinessStatusMetadata,
  type OrderBusinessStatusOrder,
  parseOrderBusinessStatusOrders,
  toOrderBusinessStatusSummary,
} from "../utils"

describe("order business status API utilities", () => {
  it("merges manual business status into existing metadata", () => {
    expect(
      buildOrderBusinessStatusMetadata({ existing: true }, "canceled")
    ).toEqual({
      existing: true,
      [ORDER_BUSINESS_STATUS_METADATA_KEY]: "canceled",
    })
  })

  it("clears only the manual business status metadata value", () => {
    expect(
      buildOrderBusinessStatusMetadata(
        {
          existing: true,
          [ORDER_BUSINESS_STATUS_METADATA_KEY]: "processing",
        },
        null
      )
    ).toEqual({
      existing: true,
      [ORDER_BUSINESS_STATUS_METADATA_KEY]: null,
    })
  })

  it("parses order-shaped query results", () => {
    expect(
      parseOrderBusinessStatusOrders([
        { id: "order_1", payment_status: "captured" },
      ])
    ).toEqual([{ id: "order_1", payment_status: "captured" }])
  })

  it("fails closed for invalid query result shapes", () => {
    expect(() => parseOrderBusinessStatusOrders({ id: "order_1" })).toThrow(
      "Expected order business status query to return an array"
    )
    expect(() =>
      parseOrderBusinessStatusOrders([{ id: "order_1" }, { id: 123 }])
    ).toThrow(
      "Expected order business status query result at index 1 to include a string id"
    )
  })

  it("returns a summary with a computed business status", () => {
    const order: OrderBusinessStatusOrder = {
      id: "order_123",
      currency_code: "czk",
      display_id: 1001,
      email: "customer@example.com",
      payment_status: "captured",
      total: 1234,
    }

    expect(toOrderBusinessStatusSummary(order)).toEqual({
      business_status: expect.objectContaining({
        id: "paid",
        translation_key: "statuses.paid",
      }),
      created_at: null,
      currency_code: "czk",
      custom_display_id: undefined,
      display_id: 1001,
      email: "customer@example.com",
      id: "order_123",
      manual_status: null,
      total: 1234,
    })
  })
})
