import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductReviewModule from "../modules/product-review"

export const ProductReviewLink = defineLink(
  {
    linkable: ProductReviewModule.linkable.review,
    field: "product_id",
  },
  ProductModule.linkable.product,
  {
    readOnly: true,
  }
)
