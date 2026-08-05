import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import BrandModule from "../modules/brand"

export const ProductBrandLink = defineLink(
  {
    isList: true,
    linkable: ProductModule.linkable["product"],
  },
  {
    filterable: ["id", "title", "handle"],
    linkable: BrandModule.linkable.brand,
  }
)
