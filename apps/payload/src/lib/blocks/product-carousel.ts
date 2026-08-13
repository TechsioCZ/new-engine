import type { Block } from "payload"
import { createMedusaProductReferenceField } from "../fields/medusa-product-reference"

export const PRODUCT_CAROUSEL_BLOCK_SLUG = "productCarousel"

export const ProductCarouselBlock: Block = {
  slug: PRODUCT_CAROUSEL_BLOCK_SLUG,
  labels: {
    singular: "Product carousel",
    plural: "Product carousels",
  },
  fields: [
    {
      name: "products",
      type: "array",
      required: true,
      minRows: 1,
      validate: (rows) => {
        if (!Array.isArray(rows)) {
          return "Select at least one product."
        }

        return rows.every(
          (row) =>
            row &&
            typeof row === "object" &&
            (("productExternalId" in row &&
              typeof row.productExternalId === "string" &&
              row.productExternalId.trim()) ||
              ("productSlug" in row &&
                typeof row.productSlug === "string" &&
                row.productSlug.trim()))
        )
          ? true
          : "Each item must reference a Medusa product."
      },
      fields: [
        createMedusaProductReferenceField(),
        {
          name: "productSlug",
          type: "text",
          admin: {
            hidden: true,
          },
        },
      ],
    },
  ],
}
