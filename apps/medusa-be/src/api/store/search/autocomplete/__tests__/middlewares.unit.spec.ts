import { describe, expect, it } from "vitest"
import { enforceExactStorefrontMarketSalesChannel } from "../../../storefront-market-sales-channel"
import { storeSearchAutocompleteRoutesMiddlewares } from "../middlewares"

describe("autocomplete storefront market middleware", () => {
  it("verifies exact publishable-key market authority before Sales Channel filtering", () => {
    const route = storeSearchAutocompleteRoutesMiddlewares[0]
    const exactMarketIndex = route?.middlewares.indexOf(
      enforceExactStorefrontMarketSalesChannel
    )

    expect(exactMarketIndex).toBe(2)
    expect(route?.middlewares[3]).toBeTypeOf("function")
  })
})
