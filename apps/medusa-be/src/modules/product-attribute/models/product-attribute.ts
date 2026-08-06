import { model } from "@medusajs/framework/utils"

const ACTIVE_ROW_CONDITION = "deleted_at IS NULL"

export const PRODUCT_ATTRIBUTE_INPUT_TYPES = ["text", "select"] as const
export type ProductAttributeInputType =
  (typeof PRODUCT_ATTRIBUTE_INPUT_TYPES)[number]

let productAttributeDefinitionReference: typeof ProductAttributeDefinition
let productAttributeOptionReference: typeof ProductAttributeOption

const ProductAttribute = model
  .define("product_attribute", {
    definition: model.belongsTo(() => productAttributeDefinitionReference, {
      mappedBy: "assignments",
    }),
    id: model.id({ prefix: "pat" }).primaryKey(),
    option: model
      .belongsTo(() => productAttributeOptionReference, {
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
      where: ACTIVE_ROW_CONDITION,
    },
    {
      name: "IDX_product_attribute_definition_id",
      on: ["definition_id"],
      where: ACTIVE_ROW_CONDITION,
    },
    {
      name: "IDX_product_attribute_option_id",
      on: ["option_id"],
      where: ACTIVE_ROW_CONDITION,
    },
  ])
  .checks([
    {
      expression: (columns) =>
        `((${columns.text_value} IS NOT NULL)::int + (${columns.option_id} IS NOT NULL)::int) = 1`,
      name: "product_attribute_exactly_one_value",
    },
  ])

export const ProductAttributeDefinition = model
  .define("product_attribute_definition", {
    assignments: model.hasMany(() => ProductAttribute, {
      mappedBy: "definition",
    }),
    id: model.id({ prefix: "patdef" }).primaryKey(),
    input_type: model.enum([...PRODUCT_ATTRIBUTE_INPUT_TYPES]),
    is_public: model.boolean().default(false),
    key: model.text().searchable(),
    label: model.text().searchable().translatable(),
    options: model.hasMany(() => productAttributeOptionReference, {
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

export const ProductAttributeOption = model
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

const initializeProductAttributeReferences = () => {
  productAttributeDefinitionReference = ProductAttributeDefinition
  productAttributeOptionReference = ProductAttributeOption
}

initializeProductAttributeReferences()

export default ProductAttribute
