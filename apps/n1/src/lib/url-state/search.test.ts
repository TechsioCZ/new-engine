import assert from "node:assert/strict"
import test from "node:test"
import {
  SEARCH_ROUTE,
  buildSearchHref,
  normalizeCategoryId,
  normalizeSearchPage,
  normalizeSearchQuery,
  toCategoryIdQueryParam,
  toPageQueryParam,
  toSearchQueryParam,
} from "./search"

test("buildSearchHref trims query and omits page=1", () => {
  const url = new URL(
    buildSearchHref({ q: "  triko  ", page: 1 }),
    "https://example.local"
  )

  assert.equal(url.pathname, SEARCH_ROUTE)
  assert.equal(url.searchParams.get("q"), "triko")
  assert.equal(url.searchParams.has("page"), false)
})

test("buildSearchHref serializes page > 1 and category_id", () => {
  const url = new URL(
    buildSearchHref({
      q: "triko",
      page: 3,
      category_id: "  pcat_abc  ",
    }),
    "https://example.local"
  )

  assert.equal(url.pathname, SEARCH_ROUTE)
  assert.equal(url.searchParams.get("q"), "triko")
  assert.equal(url.searchParams.get("page"), "3")
  assert.equal(url.searchParams.get("category_id"), "pcat_abc")
})

test("buildSearchHref removes empty values", () => {
  const url = new URL(
    buildSearchHref({
      q: "",
      page: 0,
      category_id: "  ",
    }),
    "https://example.local"
  )

  assert.equal(url.pathname, SEARCH_ROUTE)
  assert.equal(url.searchParams.toString(), "")
})

test("normalizers return expected values", () => {
  assert.equal(normalizeSearchQuery("  foo  "), "foo")
  assert.equal(normalizeSearchQuery(null), "")
  assert.equal(normalizeCategoryId("  pcat_1  "), "pcat_1")
  assert.equal(normalizeCategoryId(undefined), "")
  assert.equal(normalizeSearchPage(3.8), 3)
  assert.equal(normalizeSearchPage(-1), 1)
  assert.equal(normalizeSearchPage(undefined), 1)
})

test("toSearchQueryParam returns expected values", () => {
  assert.equal(toSearchQueryParam("  foo  "), "foo")
  assert.equal(toSearchQueryParam(" "), null)
  assert.equal(toSearchQueryParam(undefined), undefined)
})

test("toCategoryIdQueryParam returns expected values", () => {
  assert.equal(toCategoryIdQueryParam("  pcat_1  "), "pcat_1")
  assert.equal(toCategoryIdQueryParam(" "), null)
  assert.equal(toCategoryIdQueryParam(undefined), undefined)
})

test("toPageQueryParam returns expected values", () => {
  assert.equal(toPageQueryParam(1), null)
  assert.equal(toPageQueryParam(4), 4)
  assert.equal(toPageQueryParam(undefined), undefined)
})
