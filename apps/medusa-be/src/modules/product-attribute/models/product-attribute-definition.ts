import { model } from "@medusajs/framework/utils"

import ProductAttribute from "./product-attribute"
import ProductAttributeOption from "./product-attribute-option"

export const PRODUCT_ATTRIBUTE_INPUT_TYPES = ["text", "select"] as const
export type ProductAttributeInputType =
  (typeof PRODUCT_ATTRIBUTE_INPUT_TYPES)[number]

const ProductAttributeDefinition = model
  .define("product_attribute_definition", {
    assignments: model.hasMany(() => ProductAttribute, {
      mappedBy: "definition",
    }),
    id: model.id({ prefix: "patdef" }).primaryKey(),
    input_type: model.enum([...PRODUCT_ATTRIBUTE_INPUT_TYPES]),
    is_public: model.boolean().default(false),
    key: model.text().searchable(),
    label: model.text().searchable().translatable(),
    options: model.hasMany(() => ProductAttributeOption, {
      mappedBy: "definition",
    }),
  })
  .indexes([
    {
      name: "IDX_product_attribute_definition_key_unique",
      on: ["key"],
      unique: true,
    },
  ])

export default ProductAttributeDefinition
