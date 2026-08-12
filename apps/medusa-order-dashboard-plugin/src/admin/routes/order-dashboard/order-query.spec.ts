import { describe, expect, it } from "vitest"
import {
  DEFAULT_ORDER_DASHBOARD_SORTING,
  getOrderDashboardOrdersQuery,
  getOrderDashboardQueueId,
  ORDER_DASHBOARD_QUERY_KEY,
} from "./order-query"

describe("order dashboard query", () => {
  it("uses the pending unpaid queue when the URL parameter is missing", () => {
    expect(getOrderDashboardQueueId(null)).toBe("pending_unpaid")
  })

  it("falls back to all for an unsupported queue", () => {
    expect(getOrderDashboardQueueId("unsupported")).toBe("all")
  })

  it("maps table state to request parameters and a complete query key", () => {
    const query = getOrderDashboardOrdersQuery({
      carrierFilter: "packeta",
      createdAt: { $gte: "2026-08-01", $lte: "2026-08-31" },
      pagination: { pageIndex: 2, pageSize: 50 },
      queueId: "paid",
      search: "John Doe",
      sorting: { desc: false, id: "order_display_id" },
    })

    expect(query.request).toEqual({
      businessStatus: "paid",
      businessStatusGroup: undefined,
      carrier: "packeta",
      createdAt: { $gte: "2026-08-01", $lte: "2026-08-31" },
      limit: 50,
      offset: 100,
      order: "display_id",
      pendingUnpaid: undefined,
      q: "John Doe",
    })
    expect(query.queryKey).toEqual([ORDER_DASHBOARD_QUERY_KEY, query.request])
  })

  it("maps action-required and pending-unpaid queues independently", () => {
    expect(createQuery("action_required").request).toMatchObject({
      businessStatus: undefined,
      businessStatusGroup: "action_required",
      pendingUnpaid: undefined,
    })
    expect(createQuery("pending_unpaid").request).toMatchObject({
      businessStatus: undefined,
      businessStatusGroup: undefined,
      pendingUnpaid: true,
    })
  })

  it("uses one default sort for empty and unsupported table sorting", () => {
    const emptyQuery = createQuery("all", undefined)

    expect(emptyQuery.request.order).toBe("-created_at")
    expect(emptyQuery.request.q).toBeUndefined()
    expect(
      createQuery("all", { desc: false, id: "unsupported" }).request.order
    ).toBe("-created_at")
    expect(
      createQuery("all", DEFAULT_ORDER_DASHBOARD_SORTING).request.order
    ).toBe("-created_at")
  })
})

function createQuery(
  queueId: Parameters<typeof getOrderDashboardOrdersQuery>[0]["queueId"],
  sorting: Parameters<
    typeof getOrderDashboardOrdersQuery
  >[0]["sorting"] = DEFAULT_ORDER_DASHBOARD_SORTING
) {
  return getOrderDashboardOrdersQuery({
    carrierFilter: "all",
    pagination: { pageIndex: 0, pageSize: 50 },
    queueId,
    search: "",
    sorting,
  })
}
