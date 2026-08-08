import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductReviewModule from "../modules/product-review"
import { parseLinkSource } from "./parse-link-source"

const productModule = {
  linkable: {
    product: parseLinkSource(
      ProductModule.linkable["product"],
      "Product module product",
    ),
  },
}

export const ProductReviewLink = defineLink(
  {
    field: "product_id",
    linkable: ProductReviewModule.linkable.review,
  },
  productModule.linkable.product,
  {
    readOnly: true,
  },
)
