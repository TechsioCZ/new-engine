import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductAttributeModule from "../modules/product-attribute"

export const ProductProductAttributeLink = defineLink(
  {
    field: "id",
    linkable: ProductModule.linkable["product"],
  },
  {
    ...ProductAttributeModule.linkable.productAttribute.id,
    primaryKey: "product_id",
  },
  {
    isList: true,
    readOnly: true,
  },
)
