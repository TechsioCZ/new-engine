import { describe, expect, it } from "vitest"
import {
  getBusinessStatusForDashboardView,
  getDashboardCountsByView,
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
})

describe("getBusinessStatusForDashboardView", () => {
  it("maps the dashboard action-required view to the same order status filter as the list", () => {
    expect(getBusinessStatusForDashboardView("action-required")).toBe(
      "awaiting_payment"
    )
  })
})
