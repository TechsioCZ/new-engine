import { model } from "@medusajs/framework/utils"

import ProductAttribute from "./product-attribute"
import ProductAttributeDefinition from "./product-attribute-definition"

const ProductAttributeOption = model
  .define("product_attribute_option", {
    assignments: model.hasMany(() => ProductAttribute, {
      mappedBy: "option",
    }),
    definition: model.belongsTo(() => ProductAttributeDefinition, {
      mappedBy: "options",
    }),
    id: model.id({ prefix: "patopt" }).primaryKey(),
    key: model.text().searchable(),
    label: model.text().searchable().translatable(),
  })
  .indexes([
    {
      name: "IDX_product_attribute_option_definition_key_unique",
      on: ["definition_id", "key"],
      unique: true,
    },
    {
      name: "IDX_product_attribute_option_definition_id",
      on: ["definition_id"],
      where: { deleted_at: null },
    },
  ])

export default ProductAttributeOption
