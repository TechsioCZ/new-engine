import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { HttpTypes } from "@medusajs/types"
import {
  indexBlogProducts,
  resolveBlogProductReference,
} from "./blog-product-references"
import { buildProductListParams } from "./product-query-config"

const product = (
  id: string,
  values: Pick<HttpTypes.StoreProduct, "external_id" | "handle">
) => ({ id, ...values }) as HttpTypes.StoreProduct

describe("blog product references", () => {
  it("prefers the stable external ID", () => {
    const lookup = new Map()
    const byExternalId = product("external", {
      external_id: "42",
      handle: "new-handle",
    })
    const byHandle = product("handle", {
      external_id: null,
      handle: "legacy-handle",
    })
    indexBlogProducts(lookup, [byExternalId, byHandle])

    assert.equal(
      resolveBlogProductReference(
        { productExternalId: "42", productSlug: "legacy-handle" },
        lookup
      ),
      byExternalId
    )
  })

  it("falls back to an explicit handle when the external ID is unresolved", () => {
    const lookup = new Map()
    const byHandle = product("handle", {
      external_id: null,
      handle: "legacy-handle",
    })
    indexBlogProducts(lookup, [byHandle])

    assert.equal(
      resolveBlogProductReference(
        { productExternalId: "missing", productSlug: "legacy-handle" },
        lookup
      ),
      byHandle
    )
  })

  it("supports the temporary shopitem handle fallback", () => {
    const lookup = new Map()
    const byShopitemHandle = product("shopitem", {
      external_id: null,
      handle: "shopitem-42",
    })
    indexBlogProducts(lookup, [byShopitemHandle])

    assert.equal(
      resolveBlogProductReference({ productExternalId: "42" }, lookup),
      byShopitemHandle
    )
  })

  it("serializes external IDs for the Medusa Store API", () => {
    assert.deepEqual(
      buildProductListParams({ external_id: ["42", "43"], limit: 2 }),
      {
        "external_id[]": "42,43",
        external_id: undefined,
        limit: 2,
        offset: 0,
      }
    )
  })
})
