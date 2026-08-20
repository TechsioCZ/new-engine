import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import { PRODUCT_DETAIL_FIELDS } from "@/lib/storefront/product-query-config"
import {
  buildProductDetailQuery,
  resolveInitialProductVariantId,
  resolveProductDetailProduct,
} from "./product-detail-query"

const product = {
  id: "prod-stable-id",
  handle: "medusa-backend-handle",
  title: "Herbal Tea",
  variants: [{ id: "variant-1" }, { id: "variant-2" }],
} as HttpTypes.StoreProduct

describe("buildProductDetailQuery", () => {
  it("uses the resolved server product without a second handle request", () => {
    expect(
      buildProductDetailQuery({
        handle: product.handle,
        initialProduct: product,
      })
    ).toEqual({
      input: {
        enabled: false,
        fields: PRODUCT_DETAIL_FIELDS,
        handle: "medusa-backend-handle",
      },
    })
  })

  it("preserves the existing handle query for the legacy App route", () => {
    expect(buildProductDetailQuery({ handle: "legacy-handle" })).toEqual({
      input: {
        fields: PRODUCT_DETAIL_FIELDS,
        handle: "legacy-handle",
      },
    })
  })

  it("keeps a resolved stable-ID product authoritative over handle cache", () => {
    const staleCachedProduct = {
      ...product,
      id: "prod-stale-cache-entry",
    } as HttpTypes.StoreProduct

    expect(resolveProductDetailProduct(product, staleCachedProduct)).toBe(
      product
    )
    expect(resolveProductDetailProduct(undefined, staleCachedProduct)).toBe(
      staleCachedProduct
    )
  })

  it("selects a validated non-first variant for the initial server render", () => {
    expect(resolveInitialProductVariantId(product.variants, "variant-2")).toBe(
      "variant-2"
    )
  })

  it("falls back deterministically when no initial variant is available", () => {
    expect(resolveInitialProductVariantId(product.variants, undefined)).toBe(
      "variant-1"
    )
    expect(
      resolveInitialProductVariantId(product.variants, "foreign-variant")
    ).toBe("variant-1")
  })
})
