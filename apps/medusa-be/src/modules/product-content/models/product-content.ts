import { model } from "@medusajs/framework/utils"

const ProductContent = model
  .define("product_content", {
    id: model.id({ prefix: "pcont" }).primaryKey(),
    product_id: model.text().searchable(),
    usage: model.text().translatable().default(""),
    composition: model.text().translatable().default(""),
    warning: model.text().translatable().default(""),
    other: model.text().translatable().default(""),
  })
  .indexes([
    {
      name: "IDX_product_content_product_id_unique",
      on: ["product_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductContent
