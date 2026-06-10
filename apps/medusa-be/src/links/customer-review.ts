import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import ProductReviewModule from "../modules/product-review"

export const CustomerReviewLink = defineLink(
  {
    linkable: ProductReviewModule.linkable.review,
    field: "customer_id",
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
)
