import { model } from "@medusajs/framework/utils"

import ProductListItem from "./product-list-item"

const ProductList = model
  .define("product_list", {
    access_type: model.text().default("private"),
    description: model.text().nullable(),
    handle: model.text().searchable(),
    id: model.id().primaryKey(),
    items: model.hasMany(() => ProductListItem, {
      mappedBy: "list",
    }),
    metadata: model.json().nullable(),
    title: model.text().searchable(),
    type: model.text(),
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
      expression: (columns) => `${columns.type} in ('favorite', 'custom')`,
      name: "product_list_type_check",
    },
    {
      expression: (columns) =>
        `${columns.access_type} in ('private', 'public')`,
      name: "product_list_access_type_check",
    },
  ])

export default ProductList
