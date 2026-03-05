import assert from "node:assert/strict"
import test from "node:test"
import * as productsUrlState from "./products.ts"

const products =
  "default" in productsUrlState
    ? (productsUrlState.default as typeof import("./products.ts"))
    : (productsUrlState as typeof import("./products.ts"))

function toUrl(href: string): URL {
  return new URL(href, "https://example.local")
}

test("parseProductsPageRange parses single page and ranges", () => {
  assert.deepEqual(products.parseProductsPageRange("1"), {
    start: 1,
    end: 1,
    isRange: false,
  })

  assert.deepEqual(products.parseProductsPageRange("2-4"), {
    start: 2,
    end: 4,
    isRange: true,
  })

  assert.deepEqual(products.parseProductsPageRange("1-1"), {
    start: 1,
    end: 1,
    isRange: false,
  })
})

test("parseProductsPageRange rejects malformed values", () => {
  assert.equal(products.parseProductsPageRange(""), null)
  assert.equal(products.parseProductsPageRange("0"), null)
  assert.equal(products.parseProductsPageRange("-1"), null)
  assert.equal(products.parseProductsPageRange("2abc"), null)
  assert.equal(products.parseProductsPageRange("1-2-3"), null)
  assert.equal(products.parseProductsPageRange("3-2"), null)
})

test("serializeProductsPageRange canonicalizes values", () => {
  assert.equal(
    products.serializeProductsPageRange({
      start: 1,
      end: 1,
      isRange: true,
    }),
    "1"
  )

  assert.equal(
    products.serializeProductsPageRange({
      start: 2,
      end: 4,
      isRange: true,
    }),
    "2-4"
  )
})

test("buildProductsHref trims query and omits page=1", () => {
  const url = toUrl(products.buildProductsHref({ q: "  triko  ", page: 1 }))

  assert.equal(url.pathname, products.PRODUCTS_ROUTE)
  assert.equal(url.searchParams.get("q"), "triko")
  assert.equal(url.searchParams.has("page"), false)
})

test("buildProductsHref keeps page for values greater than 1", () => {
  const url = toUrl(products.buildProductsHref({ q: "bunda", page: 3 }))

  assert.equal(url.pathname, products.PRODUCTS_ROUTE)
  assert.equal(url.searchParams.get("q"), "bunda")
  assert.equal(url.searchParams.get("page"), "3")
})
