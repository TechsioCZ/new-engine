import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductListModule from "../modules/product-list"

export const ProductListItemProductLink = defineLink(
  {
    linkable: ProductListModule.linkable.productListItem,
    isList: true,
  },
  {
    linkable: ProductModule.linkable.product,
    filterable: ["id", "title", "handle"],
  }
)
