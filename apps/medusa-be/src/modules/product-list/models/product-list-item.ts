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

export default ProductListItem
