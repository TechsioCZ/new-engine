import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductListModule from "../modules/product-list"

export const ProductListItemVariantLink = defineLink(
  ProductListModule.linkable.productListItem,
  {
    linkable: ProductModule.linkable.productVariant,
    filterable: ["id", "sku", "title"],
  }
)
