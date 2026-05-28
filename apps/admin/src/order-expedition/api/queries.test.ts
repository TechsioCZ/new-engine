import { describe, expect, it } from "vitest"
import type { OrderExpeditionOrdersResponse } from "../../admin-types"
import { aggregateOrderExpeditionOrdersResponses } from "./aggregate-orders"
import { normalizeOrderExpeditionOrdersResponse } from "./queries"

function order(
  id: string,
  createdAt = "2026-05-01T00:00:00.000Z"
): OrderExpeditionOrdersResponse["orders"][number] {
  return {
    created_at: createdAt,
    id,
  } as OrderExpeditionOrdersResponse["orders"][number]
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

describe("aggregateOrderExpeditionOrdersResponses", () => {
  it("sums counts, deduplicates orders, and keeps newest orders first", () => {
    const aggregated = aggregateOrderExpeditionOrdersResponses({
      carrier: "all",
      limit: 2,
      offset: 0,
      responses: [
        response({
          count: 2,
          orders: [
            order("order_1", "2026-05-01T00:00:00.000Z"),
            order("order_2", "2026-05-03T00:00:00.000Z"),
          ],
        }),
        response({
          count: 1,
          orders: [
            order("order_2", "2026-05-03T00:00:00.000Z"),
            order("order_3", "2026-05-02T00:00:00.000Z"),
          ],
        }),
      ],
    })

    expect(aggregated.count).toBe(3)
    expect(aggregated.has_next).toBe(true)
    expect(aggregated.orders.map((item) => item.id)).toEqual([
      "order_2",
      "order_3",
    ])
  })
})
