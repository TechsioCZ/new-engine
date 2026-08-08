import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import ProductAttributeModule from "../modules/product-attribute"
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

export const ProductProductAttributeLink = defineLink(
  {
    field: "id",
    linkable: productModule.linkable.product.id,
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
