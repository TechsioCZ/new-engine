import { describe, expect, it } from "vitest"
import {
  getDashboardCountQueryViews,
  getDashboardCountsByView,
  getDashboardViewFilter,
  ORDER_UNRESOLVED_STATUS_IDS,
} from "./views"

describe("getDashboardCountsByView", () => {
  it("uses the active list count when it is higher than the tab count query", () => {
    const counts = getDashboardCountsByView({
      activeCount: 12,
      activeCountExact: true,
      activeView: "awaiting_payment",
      countQueries: [
        {
          data: {
            count: 2,
            count_exact: true,
            view: "awaiting_payment",
          },
        },
      ],
      hasActiveCount: true,
    })

    expect(counts.get("awaiting_payment")).toEqual({
      count: 12,
      countExact: true,
    })
  })

  it("keeps an inactive tab count from its own count query", () => {
    const counts = getDashboardCountsByView({
      activeCount: 23,
      activeCountExact: true,
      activeView: "all",
      countQueries: [
        {
          data: {
            count: 4,
            count_exact: true,
            view: "canceled",
          },
        },
      ],
      hasActiveCount: true,
    })

    expect(counts.get("canceled")).toEqual({
      count: 4,
      countExact: true,
    })
  })

  it("derives the action-required count from unresolved status counts", () => {
    const counts = getDashboardCountsByView({
      activeCount: 23,
      activeCountExact: true,
      activeView: "all",
      countQueries: [
        { data: { count: 1, count_exact: true, view: "new" } },
        { data: { count: 11, count_exact: true, view: "awaiting_payment" } },
        { data: { count: 2, count_exact: true, view: "paid" } },
        { data: { count: 2, count_exact: true, view: "processing" } },
        {
          data: {
            count: 2,
            count_exact: true,
            view: "waiting_for_supplier",
          },
        },
      ],
      hasActiveCount: true,
    })

    expect(counts.get("action-required")).toEqual({
      count: 18,
      countExact: true,
    })
  })
})

describe("getDashboardViewFilter", () => {
  it("maps the dashboard action-required view to unresolved order statuses", () => {
    expect(getDashboardViewFilter("action-required")).toEqual({
      kind: "statuses",
      statuses: ORDER_UNRESOLVED_STATUS_IDS,
    })
  })

  it("keeps awaiting payment as a separate single-status tab", () => {
    expect(getDashboardViewFilter("awaiting_payment")).toEqual({
      kind: "status",
      status: "awaiting_payment",
    })
  })

  it("keeps the all-orders view unfiltered", () => {
    expect(getDashboardViewFilter("all")).toEqual({
      kind: "all",
    })
  })
})

describe("getDashboardCountQueryViews", () => {
  it("flattens action-required into the unresolved status count queries", () => {
    expect(getDashboardCountQueryViews(["action-required"])).toEqual([
      ...ORDER_UNRESOLVED_STATUS_IDS,
    ])
  })
})
