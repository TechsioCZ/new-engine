import { model } from "@medusajs/framework/utils"
import ProducerAttribute from "./producer-attribute"

const ProducerAttributeType = model
  .define("producer_attribute_type", {
    id: model.id().primaryKey(),
    name: model.text(),
    attributes: model.hasMany(() => ProducerAttribute, {
      mappedBy: "attributeType",
    }),
  })
  .indexes([
    {
      name: "IDX_producer_attribute_type_name_unique",
      on: ["name"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default ProducerAttributeType
