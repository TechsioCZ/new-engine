import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductListModule from "../modules/product-list"

export const ProductListItemVariantLink = defineLink(
  {
    isList: true,
    linkable: ProductListModule.linkable.productListItem,
  },
  {
    filterable: ["id", "sku", "title"],
    linkable: ProductModule.linkable["productVariant"],
  },
)
