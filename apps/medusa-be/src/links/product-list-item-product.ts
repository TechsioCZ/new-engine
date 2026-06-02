import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductListModule from "../modules/product-list"

export const ProductListItemProductLink = defineLink(
  ProductListModule.linkable.productListItem,
  {
    linkable: ProductModule.linkable.product,
    filterable: ["id", "title", "handle"],
  }
)
