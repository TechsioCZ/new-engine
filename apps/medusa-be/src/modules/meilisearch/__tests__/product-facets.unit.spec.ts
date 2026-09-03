import { describe, expect, it } from "vitest"
import { buildProductFacetDocument } from "../facets/product-facets"

describe("product price facets", () => {
  it.each([
    ["eur", 10],
    ["czk", 242],
    ["huf", 3651],
    ["ron", 52.52],
  ])("preserves Medusa v2 major-unit amounts for %s", (currencyCode, amount) => {
    expect(
      buildProductFacetDocument({
        variants: [
          {
            prices: [{ amount, currency_code: currencyCode }],
          },
        ],
      }).facet_price
    ).toBe(amount)
  })
})
