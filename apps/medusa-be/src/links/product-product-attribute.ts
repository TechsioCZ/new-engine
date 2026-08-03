import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductAttributeModule from "../modules/product-attribute"

export const ProductProductAttributeLink = defineLink(
  {
    linkable: ProductModule.linkable.product,
    field: "id",
  },
  {
    ...ProductAttributeModule.linkable.productAttribute.id,
    primaryKey: "product_id",
  },
  {
    isList: true,
    readOnly: true,
  }
)
