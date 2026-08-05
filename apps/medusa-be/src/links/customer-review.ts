import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import ProductReviewModule from "../modules/product-review"

export const CustomerReviewLink = defineLink(
  {
    field: "customer_id",
    linkable: ProductReviewModule.linkable.review,
  },
  CustomerModule.linkable["customer"],
  {
    readOnly: true,
  }
)
