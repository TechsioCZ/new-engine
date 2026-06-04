import { model } from "@medusajs/framework/utils"
import ProductListItem from "./product-list-item"

const ProductList = model
  .define("product_list", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    handle: model.text().searchable(),
    type: model.text(),
    access_type: model.text().default("private"),
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
      name: "IDX_product_list_handle",
      on: ["handle"],
      where: { deleted_at: null },
    },
    {
      name: "IDX_product_list_access_type",
      on: ["access_type"],
      where: { deleted_at: null },
    },
  ])
  .checks([
    {
      name: "product_list_type_check",
      expression: (columns) => `${columns.type} in ('favorite', 'custom')`,
    },
    {
      name: "product_list_access_type_check",
      expression: (columns) =>
        `${columns.access_type} in ('private', 'public')`,
    },
  ])

export default ProductList
