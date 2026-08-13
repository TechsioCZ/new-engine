import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
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

    expect(
      resolveBlogProductReference(
        { productExternalId: "42", productSlug: "legacy-handle" },
        lookup
      )
    ).toBe(byExternalId)
  })

  it("falls back to an explicit handle when the external ID is unresolved", () => {
    const lookup = new Map()
    const byHandle = product("handle", {
      external_id: null,
      handle: "legacy-handle",
    })
    indexBlogProducts(lookup, [byHandle])

    expect(
      resolveBlogProductReference(
        { productExternalId: "missing", productSlug: "legacy-handle" },
        lookup
      )
    ).toBe(byHandle)
  })

  it("supports the temporary shopitem handle fallback", () => {
    const lookup = new Map()
    const byShopitemHandle = product("shopitem", {
      external_id: null,
      handle: "shopitem-42",
    })
    indexBlogProducts(lookup, [byShopitemHandle])

    expect(
      resolveBlogProductReference({ productExternalId: "42" }, lookup)
    ).toBe(byShopitemHandle)
  })

  it("serializes external IDs for the Medusa Store API", () => {
    expect(
      buildProductListParams({ external_id: ["42", "43"], limit: 2 })
    ).toEqual({
      "external_id[]": "42,43",
      external_id: undefined,
      limit: 2,
      offset: 0,
    })
  })
})
