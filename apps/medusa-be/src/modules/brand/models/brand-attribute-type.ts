import { model } from "@medusajs/framework/utils"

import BrandAttribute from "./brand-attribute"

const BrandAttributeType = model
  .define("brand_attribute_type", {
    attributes: model.hasMany(() => BrandAttribute, {
      mappedBy: "attributeType",
    }),
    id: model.id().primaryKey(),
    name: model.text(),
  })
  .indexes([
    {
      name: "IDX_brand_attribute_type_name_unique",
      on: ["name"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default BrandAttributeType
