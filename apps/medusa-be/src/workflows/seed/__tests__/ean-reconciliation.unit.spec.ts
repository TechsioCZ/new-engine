import { ProductStatus } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"

import type { ProductInput } from "../steps/create-products"
import {
  type PersistedEanOwner,
  resolveProductVariantEanClaims,
} from "../steps/reconcile-product-variant-eans"

function product(params: {
  ean?: null | string
  handle: string
  sku: string
  sourceVariantId?: string
}): ProductInput {
  return {
    title: params.handle,
    categories: [],
    description: "",
    handle: params.handle,
    images: [],
    shippingProfileName: "Default",
    salesChannelNames: [],
    status: ProductStatus.PUBLISHED,
    metadata: { source: "shoptet" },
    variants: [
      {
        title: params.sku,
        sku: params.sku,
        ean: params.ean,
        metadata: { source_variant_id: params.sourceVariantId },
      },
    ],
  }
}

function persistedOwner(params: {
  ean: string
  handle: string
  id?: string
  sku: string
  sourceVariantId?: string
}): PersistedEanOwner {
  return {
    id: params.id ?? `variant-${params.handle}`,
    ean: params.ean,
    sku: params.sku,
    product_id: `product-${params.handle}`,
    product: {
      id: `product-${params.handle}`,
      handle: params.handle,
    },
    metadata: { source_variant_id: params.sourceVariantId },
  }
}

function resolvedEan(
  products: ProductInput[],
  productHandle: string
): null | string | undefined {
  return products.find((item) => item.handle === productHandle)?.variants?.[0]
    ?.ean
}

describe("resolveProductVariantEanClaims", () => {
  it("accepts a single unowned EAN claim", () => {
    const result = resolveProductVariantEanClaims({
      persistedOwners: [],
      products: [
        product({
          ean: "3800000000001",
          handle: "shopitem-1",
          sku: "SKU-1",
          sourceVariantId: "1",
        }),
      ],
    })

    expect(resolvedEan(result.products, "shopitem-1")).toBe("3800000000001")
    expect(result.summary).toEqual({
      accepted: 1,
      collisions: 0,
      retained: 0,
      suppressed: 0,
      transferred: 0,
    })
    expect(result.issues).toEqual([])
  })

  it("selects one duplicate claimant by stable source identity regardless of input order", () => {
    const laterIdentity = product({
      ean: "3800000000002",
      handle: "shopitem-20",
      sku: "SKU-20",
      sourceVariantId: "20",
    })
    const earlierIdentity = product({
      ean: "3800000000002",
      handle: "shopitem-10",
      sku: "SKU-10",
      sourceVariantId: "10",
    })

    for (const products of [
      [laterIdentity, earlierIdentity],
      [earlierIdentity, laterIdentity],
    ]) {
      const result = resolveProductVariantEanClaims({
        persistedOwners: [],
        products,
      })

      expect(resolvedEan(result.products, "shopitem-10")).toBe("3800000000002")
      expect(resolvedEan(result.products, "shopitem-20")).toBeNull()
      expect(result.issues).toEqual([
        expect.objectContaining({
          ean: "3800000000002",
          owner: expect.objectContaining({ product_handle: "shopitem-10" }),
          resolution: "selected_stable_claimant",
        }),
      ])
    }
  })

  it("keeps an unchanged persisted owner ahead of the stable fallback", () => {
    const result = resolveProductVariantEanClaims({
      persistedOwners: [
        persistedOwner({
          ean: "3800000000003",
          handle: "shopitem-20",
          sku: "SKU-20",
          sourceVariantId: "20",
        }),
      ],
      products: [
        product({
          ean: "3800000000003",
          handle: "shopitem-10",
          sku: "SKU-10",
          sourceVariantId: "10",
        }),
        product({
          ean: "3800000000003",
          handle: "shopitem-20",
          sku: "SKU-20",
          sourceVariantId: "20",
        }),
      ],
    })

    expect(resolvedEan(result.products, "shopitem-10")).toBeNull()
    expect(resolvedEan(result.products, "shopitem-20")).toBe("3800000000003")
    expect(result.summary.retained).toBe(1)
    expect(result.summary.transferred).toBe(0)
    expect(result.transfers).toEqual([])
  })

  it("preserves a persisted owner outside the current import scope", () => {
    const result = resolveProductVariantEanClaims({
      persistedOwners: [
        persistedOwner({
          ean: "3800000000004",
          handle: "other-source-product",
          sku: "OTHER-SKU",
        }),
      ],
      products: [
        product({
          ean: "3800000000004",
          handle: "shopitem-1",
          sku: "SKU-1",
        }),
      ],
    })

    expect(resolvedEan(result.products, "shopitem-1")).toBeNull()
    expect(result.summary).toMatchObject({
      collisions: 1,
      retained: 1,
      suppressed: 1,
      transferred: 0,
    })
    expect(result.issues[0]?.resolution).toBe("preserved_out_of_scope")
  })

  it("prepares an authoritative transfer when the current owner removes its claim", () => {
    const result = resolveProductVariantEanClaims({
      persistedOwners: [
        persistedOwner({
          ean: "3800000000005",
          handle: "shopitem-1",
          id: "variant-current-owner",
          sku: "SKU-1",
          sourceVariantId: "1",
        }),
      ],
      products: [
        product({
          ean: "3800000000006",
          handle: "shopitem-1",
          sku: "SKU-1",
          sourceVariantId: "1",
        }),
        product({
          ean: "3800000000005",
          handle: "shopitem-2",
          sku: "SKU-2",
          sourceVariantId: "2",
        }),
      ],
    })

    expect(resolvedEan(result.products, "shopitem-1")).toBe("3800000000006")
    expect(resolvedEan(result.products, "shopitem-2")).toBe("3800000000005")
    expect(result.transfers).toEqual([
      { ean: "3800000000005", id: "variant-current-owner" },
    ])
    expect(result.issues).toEqual([
      expect.objectContaining({
        ean: "3800000000005",
        owner: expect.objectContaining({ product_handle: "shopitem-2" }),
        resolution: "transferred",
      }),
    ])
  })

  it("normalizes blank claims to null without inventing identifier validation", () => {
    const result = resolveProductVariantEanClaims({
      persistedOwners: [],
      products: [
        product({
          ean: "   ",
          handle: "shopitem-1",
          sku: "SKU-1",
        }),
      ],
    })

    expect(resolvedEan(result.products, "shopitem-1")).toBeNull()
    expect(result.issues).toEqual([])
  })
})
