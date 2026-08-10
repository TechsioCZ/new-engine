import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import ProductListModule from "../modules/product-list"
import { parseLinkSource } from "./parse-link-source"

const customerModule = {
  linkable: {
    customer: parseLinkSource(
      CustomerModule.linkable["customer"],
      "Customer module customer",
    ),
  },
}

export const CustomerProductListLink = defineLink(
  customerModule.linkable.customer,
  {
    filterable: ["id", "type", "handle"],
    isList: true,
    linkable: ProductListModule.linkable.productList,
  },
)
