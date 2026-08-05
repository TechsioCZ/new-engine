import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductReviewModule from "../modules/product-review"

export const ProductReviewLink = defineLink(
  {
    field: "product_id",
    linkable: ProductReviewModule.linkable.review,
  },
  ProductModule.linkable["product"],
  {
    readOnly: true,
  },
)
