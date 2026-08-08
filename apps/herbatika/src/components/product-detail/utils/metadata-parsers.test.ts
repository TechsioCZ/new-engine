import { describe, expect, it } from "vitest"

import type { Product } from "@/components/product-detail/product-detail.types"
import {
  normalizeCategoryName,
  resolveOfferState,
  resolveProductContentSections,
  resolveProductImages,
  resolveVariantLabel,
} from "@/components/product-detail/utils/metadata-parsers"

const sectionTitles = {
  composition: "Composition",
  content: "Content",
  description: "Description",
  other: "Other",
  usage: "Usage",
  warning: "Warning",
}

const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  collection_id: null,
  created_at: null,
  deleted_at: null,
  description: null,
  discountable: true,
  external_id: null,
  handle: "test-product",
  height: null,
  hs_code: null,
  id: "product-1",
  images: [],
  is_giftcard: false,
  length: null,
  material: null,
  metadata: null,
  mid_code: null,
  options: [],
  origin_country: null,
  status: "published",
  subtitle: null,
  thumbnail: null,
  title: "Test product",
  type_id: null,
  updated_at: null,
  variants: [],
  weight: null,
  width: null,
  ...overrides,
})

describe("product metadata parsers", () => {
  it("normalizes category labels and fallbacks", () => {
    expect(normalizeCategoryName("> Herbs ")).toBe("Herbs")
    expect(normalizeCategoryName("", "Fallback")).toBe("Fallback")
  })

  it("deduplicates product images and retains fallback behavior", () => {
    const product = buildProduct({
      images: [
        { id: "image-1", rank: 0, url: "/one.jpg" },
        { id: "image-2", rank: 1, url: "/two.jpg" },
      ],
      thumbnail: "/one.jpg",
    })

    expect(resolveProductImages(product)).toStrictEqual([
      "/one.jpg",
      "/two.jpg",
    ])
    expect(
      resolveProductImages(buildProduct({ id: "product-2" })),
    ).toHaveLength(1)
    expect(resolveProductImages(null)).toStrictEqual([])
  })

  it("builds variant labels from runtime-validated option values", () => {
    const variant = {
      id: "variant-1",
      options: [
        { option_id: "size", value: "Large" },
        { option_id: "ignored", value: 42 },
      ],
      title: "Default",
    }

    expect(resolveVariantLabel(variant, new Map([["size", "Size"]]))).toBe(
      "Size: Large",
    )
  })

  it("uses the product description and ordered validated metadata sections", () => {
    const product = buildProduct({
      description: "<p>Primary description</p>",
      metadata: {
        content_sections: [
          { html: "<p>Take daily</p>", key: "Usage" },
          { html: "<p>First wins</p>", key: "usage" },
        ],
        content_sections_map: { warning: "<script>bad</script>" },
      },
    })

    expect(resolveProductContentSections(product, sectionTitles)).toStrictEqual(
      [
        {
          html: "<p>Primary description</p>",
          key: "description",
          title: "Description",
        },
        { html: "<p>Take daily</p>", key: "usage", title: "Usage" },
      ],
    )
  })

  it("validates offer metadata values and preserves inventory fallbacks", () => {
    const product = buildProduct({
      metadata: {
        top_offer: {
          action_price: 80,
          apply_loyalty_discount: true,
          apply_quantity_discount: "true",
          availability_out_of_stock: "Unavailable",
          code: "CODE-1",
          current_price: 100,
          has_active_discount: "invalid",
          standard_price: 120,
          stock: { amount: 7 },
        },
      },
    })

    expect(
      resolveOfferState(product, null, {
        inStock: "In stock",
        outOfStock: "Out of stock",
      }),
    ).toMatchObject({
      applyLoyaltyDiscount: true,
      applyQuantityDiscount: false,
      availabilityLabel: "Unavailable",
      code: "CODE-1",
      currentAmount: 100,
      hasActiveDiscount: true,
      isInStock: false,
      standardAmount: 120,
      stockAmount: 0,
    })
  })
})
