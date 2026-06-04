import { model } from "@medusajs/framework/utils"
import ProductList from "./product-list"

const ProductListItem = model
  .define("product_list_item", {
    id: model.id().primaryKey(),
    quantity: model.number().default(1),
    note: model.text().nullable(),
    sort_order: model.number().default(0),
    metadata: model.json().nullable(),
    list: model.belongsTo(() => ProductList, {
      mappedBy: "items",
    }),
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
      name: "product_list_item_quantity_check",
      expression: (columns) => `${columns.quantity} >= 1`,
    },
    {
      name: "product_list_item_sort_order_check",
      expression: (columns) => `${columns.sort_order} >= 0`,
    },
  ])

export default ProductListItem
