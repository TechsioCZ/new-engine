import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductReviewModule from "../modules/product-review"
import { parseLinkSource } from "./parse-link-source"

export const ProductReviewLink = defineLink(
  {
    field: "product_id",
    linkable: ProductReviewModule.linkable.review,
  },
  parseLinkSource(ProductModule.linkable["product"], "Product module product"),
  {
    readOnly: true,
  },
)
