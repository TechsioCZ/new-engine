import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import ProductReviewModule from "../modules/product-review"
import { parseLinkSource } from "./parse-link-source"

const customerModule = {
  linkable: {
    customer: parseLinkSource(
      CustomerModule.linkable["customer"],
      "Customer module customer",
    ),
  },
}

export const CustomerReviewLink = defineLink(
  {
    field: "customer_id",
    linkable: ProductReviewModule.linkable.review,
  },
  customerModule.linkable.customer,
  {
    readOnly: true,
  },
)
