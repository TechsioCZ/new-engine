import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductListModule from "../modules/product-list"
import { parseLinkSource } from "./parse-link-source"

const productModule = {
  linkable: {
    product: parseLinkSource(
      ProductModule.linkable["product"],
      "Product module product",
    ),
  },
}

export const ProductListItemProductLink = defineLink(
  {
    isList: true,
    linkable: ProductListModule.linkable.productListItem,
  },
  {
    filterable: ["id", "title", "handle"],
    linkable: productModule.linkable.product,
  },
)
