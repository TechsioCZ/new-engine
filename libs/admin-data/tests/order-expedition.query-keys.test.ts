import { createOrderExpeditionQueryKeys } from "../src/order-expedition/query-keys"

describe("order-expedition query keys", () => {
  it("normalizes filter params and preserves namespace", () => {
    const keys = createOrderExpeditionQueryKeys(["admin", "backend"])

    expect(
      keys.orders({
        businessStatus: "all",
        carrier: "packeta",
        limit: 50,
        offset: 0,
      })
    ).toEqual([
      "admin",
      "backend",
      "order-expedition",
      "orders",
      { businessStatus: "all", carrier: "packeta", limit: 50, offset: 0 },
    ])

    expect(keys.ordersRoot()).toEqual([
      "admin",
      "backend",
      "order-expedition",
      "orders",
    ])
  })

  it("sorts by-id lookup ids for stable cache keys", () => {
    const keys = createOrderExpeditionQueryKeys("admin")

    expect(keys.businessStatusesByIds({ ids: ["ord_b", "ord_a"] })).toEqual([
      "admin",
      "order-expedition",
      "business-statuses-by-ids",
      { ids: ["ord_a", "ord_b"] },
    ])
  })
})
