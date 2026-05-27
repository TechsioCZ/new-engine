import { describe, expect, it } from "vitest"
import type { OrderExpeditionOrdersResponse } from "../../admin-types"
import { normalizeOrderExpeditionOrdersResponse } from "./queries"

function order(id: string): OrderExpeditionOrdersResponse["orders"][number] {
  return { id } as OrderExpeditionOrdersResponse["orders"][number]
}

function response(
  override: Partial<OrderExpeditionOrdersResponse>
): OrderExpeditionOrdersResponse {
  return {
    business_status: null,
    carrier: null,
    carrier_filter_limit_reached: false,
    count: 0,
    count_exact: true,
    has_next: false,
    limit: 50,
    offset: 0,
    orders: [],
    scanned_count: null,
    ...override,
  }
}

describe("normalizeOrderExpeditionOrdersResponse", () => {
  it("never reports a count lower than the loaded row count", () => {
    const normalized = normalizeOrderExpeditionOrdersResponse(
      response({
        count: 2,
        orders: [order("order_1"), order("order_2"), order("order_3")],
      })
    )

    expect(normalized.count).toBe(3)
    expect(normalized.count_exact).toBe(true)
  })

  it("marks a corrected count as inexact when more pages may exist", () => {
    const normalized = normalizeOrderExpeditionOrdersResponse(
      response({
        count: 2,
        has_next: true,
        orders: [order("order_1"), order("order_2"), order("order_3")],
      })
    )

    expect(normalized.count).toBe(3)
    expect(normalized.count_exact).toBe(false)
  })

  it("includes the current offset when normalizing paginated responses", () => {
    const normalized = normalizeOrderExpeditionOrdersResponse(
      response({
        count: 25,
        offset: 50,
        orders: [order("order_51"), order("order_52")],
      })
    )

    expect(normalized.count).toBe(52)
  })
})
