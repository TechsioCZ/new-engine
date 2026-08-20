import { describe, expect, it } from "vitest"
import { resolveStorefrontSalesChannelFilter } from "../search-results"

describe("resolveStorefrontSalesChannelFilter", () => {
  it("uses the trusted publishable-key channels when transformed filters are empty", () => {
    expect(resolveStorefrontSalesChannelFilter(undefined, ["sc_cz"])).toEqual([
      "sc_cz",
    ])
  })

  it("keeps transformed filters when no publishable-key context exists", () => {
    const filter = { $in: ["sc_sk"] }

    expect(resolveStorefrontSalesChannelFilter(filter, undefined)).toBe(filter)
  })

  it("does not let a query filter override trusted publishable-key channels", () => {
    expect(resolveStorefrontSalesChannelFilter(["sc_sk"], ["sc_cz"])).toEqual([
      "sc_cz",
    ])
  })
})
