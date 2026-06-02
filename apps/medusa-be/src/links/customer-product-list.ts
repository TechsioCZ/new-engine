import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import ProductListModule from "../modules/product-list"

export const CustomerProductListLink = defineLink(
  {
    linkable: CustomerModule.linkable.customer,
    isList: true,
  },
  {
    linkable: ProductListModule.linkable.productList,
    filterable: ["id", "type", "handle"],
  }
)
