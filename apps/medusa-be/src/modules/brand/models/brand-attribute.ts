import { model } from "@medusajs/framework/utils"

import Brand from "./brand"
import BrandAttributeType from "./brand-attribute-type"

const BrandAttribute = model.define("brand_attribute", {
  attributeType: model.belongsTo(() => BrandAttributeType, {
    mappedBy: "attributes",
  }),
  brand: model.belongsTo(() => Brand, {
    mappedBy: "attributes",
  }),
  id: model.id().primaryKey(),
  value: model.text(),
})

export default BrandAttribute
