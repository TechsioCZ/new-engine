import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductAttributeModule from "../modules/product-attribute"
import { parseNestedSerializedLinkSource } from "./parse-link-source"

export const ProductProductAttributeLink = defineLink(
  {
    field: "id",
    linkable: parseNestedSerializedLinkSource(
      ProductModule.linkable["product"],
      "id",
      "Product module product id",
    ),
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
