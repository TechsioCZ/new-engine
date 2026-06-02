import { model } from "@medusajs/framework/utils"
import ProductListItem from "./product-list-item"

const ProductList = model
  .define("product_list", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    handle: model.text().searchable(),
    type: model.text(),
    description: model.text().nullable(),
    metadata: model.json().nullable(),
    items: model.hasMany(() => ProductListItem, {
      mappedBy: "list",
    }),
  })
  .indexes([
    {
      name: "IDX_product_list_type",
      on: ["type"],
      where: { deleted_at: null },
    },
    {
      name: "IDX_product_list_custom_handle_unique",
      on: ["handle"],
      unique: true,
      where: { deleted_at: null, type: "custom" },
    },
  ])

export default ProductList
