import { model } from "@medusajs/framework/utils"

import ProductList from "./product-list"

const ProductListItem = model
  .define("product_list_item", {
    id: model.id().primaryKey(),
    list: model.belongsTo(() => ProductList, {
      mappedBy: "items",
    }),
    metadata: model.json().nullable(),
    note: model.text().nullable(),
    quantity: model.number().default(1),
    sort_order: model.number().default(0),
  })
  .indexes([
    {
      name: "IDX_product_list_item_list_id",
      on: ["list_id"],
      where: { deleted_at: null },
    },
    {
      name: "IDX_product_list_item_list_sort_order",
      on: ["list_id", "sort_order"],
      where: { deleted_at: null },
    },
  ])
  .checks([
    {
      expression: (columns) => `${columns.quantity} >= 1`,
      name: "product_list_item_quantity_check",
    },
    {
      expression: (columns) => `${columns.sort_order} >= 0`,
      name: "product_list_item_sort_order_check",
    },
  ])

export default ProductListItem
