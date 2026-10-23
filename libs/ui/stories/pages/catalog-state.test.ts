import { describe, expect, it } from "vitest"
import {
  initialListing,
  type ListingState,
  listingUrl,
  PRICE_MAX,
  pageFromUrl,
} from "./catalog-state"
import { sortOptions } from "./data"

describe("Catalog URL restoration", () => {
  it.each(sortOptions)(
    "restores page, facets and $value sort from a followed link",
    ({ value }) => {
      const state: ListingState = {
        brands: ["meridian"],
        sizes: ["M"],
        colors: ["Black"],
        price: [20, 200],
        sort: value,
      }
      const href = listingUrl(
        2,
        state,
        "?id=category&globals=brand:akros&other=keep"
      )
      expect(initialListing(href)).toEqual(state)
      expect(pageFromUrl(href)).toBe(2)
      const params = new URLSearchParams(href)
      expect(params.get("id")).toBe("category")
      expect(params.get("globals")).toBe("brand:akros")
      expect(params.get("other")).toBe("keep")
    }
  )

  it("keeps reset facets empty rather than reapplying defaults on a direct page-2 link", () => {
    const reset = initialListing("")
    expect(reset).toEqual({
      brands: [],
      sizes: [],
      colors: [],
      price: [0, PRICE_MAX],
      sort: "relevance",
    })
    const href = listingUrl(
      2,
      reset,
      "?catalog-brands=northwind&catalog-sizes=M"
    )
    expect(initialListing(href)).toEqual(reset)
    expect(pageFromUrl(href)).toBe(2)
    expect(new URLSearchParams(href).get("catalog-brands")).toBe("")
    expect(new URLSearchParams(href).get("catalog-sizes")).toBe("")
  })

  it("normalizes invalid facets, sort, price bounds and page numbers", () => {
    expect(
      initialListing(
        "?catalog-brands=unknown,meridian&catalog-sizes=unknown,M&catalog-sort=unknown&catalog-price=200,20"
      )
    ).toEqual({
      brands: ["meridian"],
      sizes: ["M"],
      colors: [],
      price: [0, PRICE_MAX],
      sort: "relevance",
    })
    for (const price of ["NaN,10", "-1,10", "0,1301", "100", "0,1,2"]) {
      expect(initialListing(`?catalog-price=${price}`).price).toEqual([
        0,
        PRICE_MAX,
      ])
    }
    for (const page of ["", "0", "-2", "1.5", "NaN", "Infinity"]) {
      expect(pageFromUrl(`?page=${page}`)).toBe(1)
    }
  })
})
