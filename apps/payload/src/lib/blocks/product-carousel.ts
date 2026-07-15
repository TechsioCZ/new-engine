import type { Block } from "payload"

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
      fields: [
        {
          name: "productSlug",
          type: "text",
          required: true,
          admin: {
            components: {
              Field:
                "/components/admin/medusa-product-slug-field#MedusaProductSlugField",
            },
          },
        },
      ],
    },
  ],
}
