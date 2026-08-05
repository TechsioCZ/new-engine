import { model } from "@medusajs/framework/utils"

import ProductAttributeDefinition from "./product-attribute-definition"
import ProductAttributeOption from "./product-attribute-option"

const ProductAttribute = model
  .define("product_attribute", {
    definition: model.belongsTo(() => ProductAttributeDefinition, {
      mappedBy: "assignments",
    }),
    id: model.id({ prefix: "pat" }).primaryKey(),
    option: model
      .belongsTo(() => ProductAttributeOption, {
        mappedBy: "assignments",
      })
      .nullable(),
    product_id: model.text().searchable(),
    text_value: model.text().translatable().nullable(),
  })
  .indexes([
    {
      name: "IDX_product_attribute_product_definition_unique",
      on: ["product_id", "definition_id"],
      unique: true,
    },
    {
      name: "IDX_product_attribute_product_id",
      on: ["product_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_attribute_definition_id",
      on: ["definition_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_attribute_option_id",
      on: ["option_id"],
      where: "deleted_at IS NULL",
    },
  ])
  .checks([
    {
      expression: (columns) =>
        `((${columns.text_value} IS NOT NULL)::int + (${columns.option_id} IS NOT NULL)::int) = 1`,
      name: "product_attribute_exactly_one_value",
    },
  ])

export default ProductAttribute
