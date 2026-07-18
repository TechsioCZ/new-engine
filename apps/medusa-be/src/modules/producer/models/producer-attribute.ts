import { model } from "@medusajs/framework/utils"

import Producer from "./producer"
import ProducerAttributeType from "./producer-attribute-type"

const ProducerAttribute = model.define("producer_attribute", {
  id: model.id().primaryKey(),
  value: model.text(),
  attributeType: model.belongsTo(() => ProducerAttributeType, {
    mappedBy: "attributes",
  }),
  producer: model.belongsTo(() => Producer, {
    mappedBy: "attributes",
  }),
})

export default ProducerAttribute
