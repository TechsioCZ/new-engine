import { describe, expect, it } from "vitest"
import { extractLegacyPublicSlugs } from "./public-slug-projections"

describe("extractLegacyPublicSlugs", () => {
  it("recovers source slugs and Medusa handles from dehydrated data", () => {
    expect(
      extractLegacyPublicSlugs({
        queries: [
          {
            state: {
              data: {
                categories: [{ handle: "bylinky", id: "cat_1" }],
                products: [{ handle: "ashwagandha", id: "prod_1" }],
                related: [{ slug: "spanok", sourceId: "article_1" }],
              },
            },
          },
        ],
      })
    ).toEqual({
      article_1: "spanok",
      cat_1: "bylinky",
      prod_1: "ashwagandha",
    })
  })

  it("ignores empty and unrelated values", () => {
    expect(
      extractLegacyPublicSlugs({
        empty: { handle: "", id: "prod_empty" },
        unrelated: { id: "region_1", name: "Slovakia" },
      })
    ).toEqual({})
  })
})
