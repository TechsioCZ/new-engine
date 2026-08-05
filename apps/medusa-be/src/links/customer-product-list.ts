import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import ProductListModule from "../modules/product-list"

export const CustomerProductListLink = defineLink(
  CustomerModule.linkable["customer"],
  {
    filterable: ["id", "type", "handle"],
    isList: true,
    linkable: ProductListModule.linkable.productList,
  },
)
