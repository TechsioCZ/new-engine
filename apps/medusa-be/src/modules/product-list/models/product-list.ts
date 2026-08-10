import { model } from "@medusajs/framework/utils"

let productListItemReference: typeof ProductListItem

export const ProductList = model
  .define("product_list", {
    access_type: model.text().default("private"),
    description: model.text().nullable(),
    handle: model.text().searchable(),
    id: model.id().primaryKey(),
    items: model.hasMany(() => productListItemReference, {
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

export const ProductListItem = model
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

const initializeProductListItemReference = () => {
  productListItemReference = ProductListItem
}

initializeProductListItemReference()
