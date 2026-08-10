import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductListModule from "../modules/product-list"
import { parseLinkSource } from "./parse-link-source"

const productModule = {
  linkable: {
    productVariant: parseLinkSource(
      ProductModule.linkable["productVariant"],
      "Product module product variant",
    ),
  },
}

export const ProductListItemVariantLink = defineLink(
  {
    isList: true,
    linkable: ProductListModule.linkable.productListItem,
  },
  {
    filterable: ["id", "sku", "title"],
    linkable: productModule.linkable.productVariant,
  },
)
