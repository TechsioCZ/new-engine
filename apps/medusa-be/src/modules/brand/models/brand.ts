import { model } from "@medusajs/framework/utils"
import BrandAttribute from "./brand-attribute"

const Brand = model
  .define("brand", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    handle: model.text().searchable(),
    attributes: model.hasMany(() => BrandAttribute, {
      mappedBy: "brand",
    }),
  })
  .indexes([
    {
      name: "IDX_brand_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default Brand
