import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import ProductReviewModule from "../modules/product-review"
import { parseLinkSource } from "./parse-link-source"

export const CustomerReviewLink = defineLink(
  {
    field: "customer_id",
    linkable: ProductReviewModule.linkable.review,
  },
  parseLinkSource(
    CustomerModule.linkable["customer"],
    "Customer module customer",
  ),
  {
    readOnly: true,
  },
)
