import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { allCategories } from "@/data/static/categories"
import {
  __searchSuggestionsTestUtils,
  getSearchSuggestions,
} from "./search-suggestions-service"

const {
  fetchCategorySuggestionsFromStaticData,
  mergeBrandSuggestions,
  normalizeSearchText,
} = __searchSuggestionsTestUtils

describe("search suggestions service helpers", () => {
  it("normalizes diacritics and casing", () => {
    assert.equal(normalizeSearchText("Žluťoučký KŮŇ"), "zlutoucky kun")
  })

  it("finds static category fallback suggestions for known handle token", () => {
    const sampleCategory = allCategories.find((category) => category.handle.length >= 3)
    assert.ok(sampleCategory, "Expected at least one static category")

    const token =
      sampleCategory.handle.split("-").find((part) => part.length >= 3) ||
      sampleCategory.handle
    const suggestions = fetchCategorySuggestionsFromStaticData(token, 20)

    assert.ok(
      suggestions.some(
        (suggestion) =>
          suggestion.id === sampleCategory.id ||
          suggestion.handle === sampleCategory.handle
      ),
      `Expected fallback suggestions to contain ${sampleCategory.handle}`
    )
  })

  it("keeps product-derived brands when product section is already full", () => {
    const brandsFromProducts = [
      { id: "b1", title: "Brand One", handle: "brand-one" },
      { id: "b2", title: "Brand Two", handle: "brand-two" },
    ]
    const brandsFromMeili = [{ id: "b3", title: "Brand Three", handle: "brand-three" }]

    const merged = mergeBrandSuggestions(brandsFromProducts, brandsFromMeili, 2)
    assert.deepEqual(merged, brandsFromProducts)
  })

  it("returns empty suggestions when region is missing", async () => {
    const suggestions = await getSearchSuggestions("kolo", {
      countryCode: "cz",
    })

    assert.deepEqual(suggestions, {
      products: [],
      categories: [],
      brands: [],
    })
  })
})
