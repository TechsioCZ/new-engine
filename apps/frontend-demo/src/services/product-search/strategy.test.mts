import assert from "node:assert/strict"
import test from "node:test"
import * as strategyModule from "./strategy.ts"

const strategy =
  "default" in strategyModule
    ? (strategyModule.default as typeof import("./strategy.ts"))
    : (strategyModule as typeof import("./strategy.ts"))

test("selectProductFetchStrategy: uses MEILI_ONLY for plain text query", () => {
  const selected = strategy.selectProductFetchStrategy({
    q: "triko",
    sort: "newest",
  })

  assert.equal(selected, "MEILI_ONLY")
})

test("selectProductFetchStrategy: uses MEILI_ONLY for canonical newest sort", () => {
  const selected = strategy.selectProductFetchStrategy({
    q: "triko",
    sort: "-created_at",
  })

  assert.equal(selected, "MEILI_ONLY")
})

test("selectProductFetchStrategy: uses MEILI_SIZE_INTERSECTION for q + sizes", () => {
  const selected = strategy.selectProductFetchStrategy({
    q: "triko",
    filters: { sizes: ["M"] },
  })

  assert.equal(selected, "MEILI_SIZE_INTERSECTION")
})

test("selectProductFetchStrategy: uses SIZE_ONLY_FALLBACK for sizes without q", () => {
  const selected = strategy.selectProductFetchStrategy({
    filters: { sizes: ["M"] },
  })

  assert.equal(selected, "SIZE_ONLY_FALLBACK")
})

test("selectProductFetchStrategy: uses MEILI_CATEGORY_INTERSECTION for q + category", () => {
  const selected = strategy.selectProductFetchStrategy({
    q: "triko",
    category: "cat_123",
  })

  assert.equal(selected, "MEILI_CATEGORY_INTERSECTION")
})

test("selectProductFetchStrategy: falls back to default when sort is non-newest", () => {
  const selected = strategy.selectProductFetchStrategy({
    q: "triko",
    sort: "name-asc",
  })

  assert.equal(selected, "DEFAULT_MEDUSA")
})

test("selectProductFetchStrategy: uses MEILI_CATEGORY_SIZE_INTERSECTION for q + category + sizes", () => {
  const selected = strategy.selectProductFetchStrategy({
    q: "triko",
    category: "cat_123",
    filters: { sizes: ["M"] },
  })

  assert.equal(selected, "MEILI_CATEGORY_SIZE_INTERSECTION")
})

test("selectProductFetchStrategy: falls back to default for q + category + sizes when sort is non-newest", () => {
  const selected = strategy.selectProductFetchStrategy({
    q: "triko",
    category: "cat_123",
    sort: "name-asc",
    filters: { sizes: ["M"] },
  })

  assert.equal(selected, "DEFAULT_MEDUSA")
})

test("normalizeSizes trims and deduplicates values", () => {
  const normalized = strategy.normalizeSizes([" M ", "L", "M", ""])

  assert.deepEqual(normalized, ["M", "L"])
})

test("normalizeCategoriesInput merges, trims and deduplicates", () => {
  const normalized = strategy.normalizeCategoriesInput(
    [" cat_1 ", "cat_2"],
    { categories: ["cat_2", "cat_3", "  "] }
  )

  assert.deepEqual(normalized, ["cat_1", "cat_2", "cat_3"])
})
