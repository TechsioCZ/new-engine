import { describe, expect, it } from "vitest"
import {
  createBrandSuggestions,
  createCategorySuggestions,
} from "./search-autocomplete-taxonomy-normalizers"

describe("taxonomy autocomplete URL projections", () => {
  it("builds localized category and brand paths from stable source IDs", () => {
    expect(
      createCategorySuggestions({
        categoryHits: [
          { id: "cat_1", name: "Čaje", handle: "legacy-category" },
        ],
        market: "hu",
        publicSlugsByCategoryId: { cat_1: "teak" },
      })
    ).toEqual([
      {
        href: "/kategoriak/teak",
        id: "cat_1",
        sourceId: "cat_1",
        title: "Čaje",
        type: "category",
      },
    ])

    expect(
      createBrandSuggestions({
        brandHits: [
          { id: "brand_1", title: "Herbatica", handle: "legacy-brand" },
        ],
        market: "ro",
        publicSlugsByBrandId: { brand_1: "herbatica" },
      })
    ).toEqual([
      {
        href: "/marci/herbatica",
        id: "brand_1",
        sourceId: "brand_1",
        title: "Herbatica",
        type: "brand",
      },
    ])
  })

  it("omits taxonomy hits without stable IDs or public projections", () => {
    expect(
      createCategorySuggestions({
        categoryHits: [{ name: "Čaje", handle: "legacy-category" }],
        market: "sk",
        publicSlugsByCategoryId: {},
      })
    ).toEqual([])
    expect(
      createBrandSuggestions({
        brandHits: [{ title: "Herbatica", handle: "legacy-brand" }],
        market: "sk",
        publicSlugsByBrandId: {},
      })
    ).toEqual([])
  })
})
