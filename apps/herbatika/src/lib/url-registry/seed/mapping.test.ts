import { describe, expect, it } from "vitest"
import { SlugError } from "../../url/slug"
import { mapSeedSources } from "./mapping.mjs"

describe("mapSeedSources", () => {
  it("maps market-scoped Medusa and CMS entities to stable equivalence keys", () => {
    const records = mapSeedSources([
      {
        market: "sk",
        products: [{ id: "prod_1", handle: "Zelený čaj" }],
        categories: [{ id: "cat_1", handle: "Bylinné čaje" }],
        collections: [{ id: "col_1", handle: "Darčeky" }],
        brands: [{ id: "brand_1", handle: "Pukka" }],
        articles: [{ id: 7, slug: "Čo je matcha?" }],
        pages: [{ id: 8, slug: "O nás" }],
      },
      {
        market: "hu",
        products: [{ id: "prod_1", handle: "Zöld tea" }],
      },
    ])

    expect(records).toContainEqual({
      market: "sk",
      kind: "product",
      slug: "zeleny-caj",
      entityId: "prod_1",
      equivalenceKey: "product:prod_1",
      indexable: true,
    })
    expect(records).toContainEqual(
      expect.objectContaining({
        market: "hu",
        kind: "product",
        slug: "zold-tea",
        equivalenceKey: "product:prod_1",
      })
    )
    expect(records.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining([
        "category",
        "collection",
        "brand",
        "article",
        "page",
      ])
    )
  })

  it("deduplicates repeated entities returned by a source page", () => {
    const records = mapSeedSources([
      {
        market: "sk",
        products: [
          { id: "prod_1", handle: "caj" },
          { id: "prod_1", handle: "caj" },
        ],
      },
    ])
    expect(records).toHaveLength(1)
  })

  it("rejects collisions rather than adding a suffix", () => {
    expect(() =>
      mapSeedSources([
        {
          market: "hu",
          products: [
            { id: "prod_1", handle: "kor" },
            { id: "prod_2", handle: "kór" },
          ],
        },
      ])
    ).toThrow(SlugError)
  })

  it("rejects reserved source slugs", () => {
    expect(() =>
      mapSeedSources([{ market: "ro", pages: [{ id: "page_1", slug: "api" }] }])
    ).toThrow(SlugError)
  })
})
