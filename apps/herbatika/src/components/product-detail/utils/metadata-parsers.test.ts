import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import type { Product } from "@/components/product-detail/product-detail.types"
import {
  resolveOfferState,
  resolveProductContentSections,
} from "./metadata-parsers"

const productDetailSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/product-detail/use-product-detail-data.ts"
  ),
  "utf8"
)

const sectionTitles = {
  composition: "Compoziție",
  content: "Conținut",
  description: "Descriere",
  other: "Alte informații",
  usage: "Utilizare",
  warning: "Avertisment",
}

describe("resolveProductContentSections", () => {
  it("renders only the official Romanian description when demo product content is exactly empty", () => {
    const product = {
      description: "<p>Descriere oficială în limba română.</p>",
      metadata: {
        content_sections: [
          {
            html: "<p>Descriere slovacă învechită.</p>",
            key: "description",
          },
          { html: "", key: "usage" },
          { html: "<p>&nbsp; </p>", key: "composition" },
          { html: "<p> \n\t </p>", key: "warning" },
          { html: "<script>text slovac ascuns</script>", key: "other" },
        ],
        content_sections_map: {
          composition: "<p>&nbsp;</p>",
          description: "<p>Descriere slovacă învechită.</p>",
          other: "",
          usage: "",
          warning: "",
        },
      },
    } as unknown as HttpTypes.StoreProduct

    expect(resolveProductContentSections(product, sectionTitles)).toEqual([
      {
        html: "<p>Descriere oficială în limba română.</p>",
        key: "description",
        title: "Descriere",
      },
    ])
  })
})

const productWithSlovakOffer = {
  id: "prod_1",
  metadata: {
    top_offer: {
      availability_in_stock: "Skladom",
      availability_out_of_stock: "Momentálne nie je skladom",
    },
  },
} as unknown as Product

const inStockVariant = {
  id: "variant_1",
  calculated_price: { calculated_amount: 120 },
  manage_inventory: false,
} as HttpTypes.StoreProductVariant

describe("resolveOfferState localization", () => {
  it("ignores Slovak source availability labels for RO", () => {
    const result = resolveOfferState(productWithSlovakOffer, inStockVariant, {
      allowSourceLabels: false,
      inStock: "În stoc",
      outOfStock: "Momentan nu este în stoc",
    })

    expect(result.availabilityLabel).toBe("În stoc")
    expect(result.availabilityLabel).not.toContain("Skladom")
    expect(productDetailSource).toContain('allowSourceLabels: market === "sk"')
  })

  it("preserves source availability labels for SK", () => {
    const result = resolveOfferState(productWithSlovakOffer, inStockVariant, {
      allowSourceLabels: true,
      inStock: "Skladom",
      outOfStock: "Momentálne nie je skladom",
    })

    expect(result.availabilityLabel).toBe("Skladom")
  })
})
