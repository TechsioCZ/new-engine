import { describe, expect, it } from "vitest"
import type {
  SearchAutocompleteResponse,
  SearchAutocompleteSuggestion,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import { buildPath } from "@/lib/url/public-url"
import {
  isCanonicalPublicSuggestion,
  type ProjectableSearchSuggestion,
  projectSearchAutocompleteResponse,
} from "./public-search-suggestions"

const suggestion = (href: string): SearchAutocompleteSuggestion => ({
  href,
  id: "stable-source-id",
  title: "Result",
  type: "product",
})

describe("public search suggestion boundary", () => {
  it.each([
    "/p/handle",
    "/c/handle",
    "/znacka/title-slug",
    "/search?q=x",
  ])("rejects legacy producer href %s", (href) => {
    expect(isCanonicalPublicSuggestion(suggestion(href))).toBe(false)
  })

  it.each([
    "https://example.test/product",
    "//example.test/product",
    "/~sf/sk/products/x",
  ])("rejects non-public href %s", (href) => {
    expect(isCanonicalPublicSuggestion(suggestion(href))).toBe(false)
  })

  it.each([
    "/produkt/public-slug",
    "/produkt/public-slug?variant=variant-1",
  ])("accepts a canonical public href %s", (href) => {
    expect(isCanonicalPublicSuggestion(suggestion(href))).toBe(true)
  })

  it("projects every suggestion kind from its stable source ID", () => {
    const response: SearchAutocompleteResponse = {
      brands: [
        { ...suggestion("/znacka/handle"), id: "brand-1", type: "brand" },
      ],
      categories: [
        { ...suggestion("/c/handle"), id: "category-1", type: "category" },
      ],
      content: [
        { ...suggestion("/blog/handle"), id: "article-1", type: "content" },
      ],
      products: [
        {
          ...suggestion("/p/handle"),
          id: "product-1-variant-1",
          sourceId: "product-1",
        } as ProjectableSearchSuggestion,
      ],
      query: "result",
    }

    const projected = projectSearchAutocompleteResponse(
      response,
      {
        articlePublicSlugsById: { "article-1": "public-article" },
        brandPublicSlugsById: { "brand-1": "public-brand" },
        categoryPublicSlugsById: { "category-1": "public-category" },
        productPublicSlugsById: { "product-1": "public-product" },
      },
      "sk"
    )

    expect(projected.products[0]?.href).toBe(
      buildPath({ kind: "product", slug: "public-product" }, "sk")
    )
    expect(projected.categories[0]?.href).toBe(
      buildPath({ kind: "category", slug: "public-category" }, "sk")
    )
    expect(projected.brands[0]?.href).toBe(
      buildPath({ kind: "brand", slug: "public-brand" }, "sk")
    )
    expect(projected.content[0]?.href).toBe(
      buildPath({ kind: "article", slug: "public-article" }, "sk")
    )
  })

  it("drops suggestions without a stable-ID projection", () => {
    const response: SearchAutocompleteResponse = {
      brands: [],
      categories: [],
      content: [],
      products: [suggestion("/p/handle")],
      query: "result",
    }

    expect(
      projectSearchAutocompleteResponse(response, {}, "sk").products
    ).toEqual([])
  })
})
