import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import ProductListModule from "../modules/product-list"

export const CustomerProductListLink = defineLink(
  CustomerModule.linkable.customer,
  {
    linkable: ProductListModule.linkable.productList,
    filterable: ["id", "type", "handle"],
    isList: true,
  }
)
