import { model } from "@medusajs/framework/utils"
import MeasurementUnit from "./measurement-unit"

const ProductMeasurement = model
  .define("product_measurement", {
    id: model.id().primaryKey(),
    product_id: model.text().searchable(),
    product_unit_quantity: model.bigNumber(),
    measurementUnit: model.belongsTo(() => MeasurementUnit, {
      mappedBy: "productMeasurements",
    }),
  })
  .indexes([
    {
      name: "IDX_product_measurement_product_id_unique",
      on: ["product_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])
  .checks([
    {
      name: "product_measurement_quantity_positive",
      expression: (columns) => `${columns.product_unit_quantity} > 0`,
    },
  ])

export default ProductMeasurement
