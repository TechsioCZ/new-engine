import { createActionRequiredQueryKeys } from "../src/action-required/query-keys"

describe("action-required query keys", () => {
  it("normalizes list params and preserves namespace", () => {
    const keys = createActionRequiredQueryKeys(["admin", "backend"])

    expect(
      keys.orders({
        limit: 50,
        offset: 0,
      })
    ).toEqual([
      "admin",
      "backend",
      "action-required",
      "orders",
      { limit: 50, offset: 0 },
    ])

    expect(keys.summary({})).toEqual([
      "admin",
      "backend",
      "action-required",
      "summary",
      {},
    ])
  })
})
