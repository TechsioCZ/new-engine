import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductListModule from "../modules/product-list"

export const ProductListItemProductLink = defineLink(
  {
    isList: true,
    linkable: ProductListModule.linkable.productListItem,
  },
  {
    filterable: ["id", "title", "handle"],
    linkable: ProductModule.linkable["product"],
  },
)
