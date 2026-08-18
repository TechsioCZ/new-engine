import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductContentModule from "../modules/product-content"

export const ProductContentLink = defineLink(
  {
    field: "id",
    linkable: ProductModule.linkable.product,
  },
  {
    ...ProductContentModule.linkable.productContent.id,
    primaryKey: "product_id",
  },
  {
    readOnly: true,
  }
)
