import { describe, expect, it } from "vitest"

import { buildProductFacetDocument } from "../../../src/modules/meilisearch/facets/product-facets"

describe("product price facet currency safety", () => {
  it("does not collapse prices from different currencies into one bound", () => {
    const document = buildProductFacetDocument({
      variants: [
        { prices: [{ amount: 1000, currency_code: "eur" }] },
        { prices: [{ amount: 100, currency_code: "czk" }] },
      ],
    })

    expect(document.facet_price).toBeUndefined()
  })

  it("uses the minimum variant price when every price has one currency", () => {
    const document = buildProductFacetDocument({
      variants: [
        {
          prices: [
            { amount: 1999, currency_code: "EUR" },
            { amount: 1599, currency_code: "eur" },
          ],
        },
      ],
    })

    expect(document.facet_price).toBe(15.99)
  })
})
