import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import BrandModule from "../modules/brand"

export const ProductBrandLink = defineLink(
  {
    linkable: ProductModule.linkable.product,
    isList: true,
  },
  {
    linkable: BrandModule.linkable.brand,
    filterable: ["id", "title", "handle"],
  }
)
