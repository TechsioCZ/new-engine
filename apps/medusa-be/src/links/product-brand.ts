import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import BrandModule from "../modules/brand"
import { parseNestedSerializedLinkSource } from "./parse-link-source"

const productModule = {
  linkable: {
    product: {
      id: parseNestedSerializedLinkSource(
        ProductModule.linkable["product"],
        "id",
        "Product module product id",
      ),
    },
  },
}

export const ProductBrandLink = defineLink(
  {
    isList: true,
    linkable: productModule.linkable.product.id,
  },
  {
    filterable: ["id", "title", "handle"],
    linkable: BrandModule.linkable.brand,
  },
)
