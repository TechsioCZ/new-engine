import { model } from "@medusajs/framework/utils"
import MeasurementUnit from "./measurement-unit"
import ProductVariantMeasurement from "./product-variant-measurement"

const ProductMeasurement = model
  .define("product_measurement", {
    id: model.id().primaryKey(),
    product_id: model.text().searchable(),
    measurement_unit: model.belongsTo(() => MeasurementUnit, {
      mappedBy: "product_measurements",
    }),
    variant_measurements: model.hasMany(() => ProductVariantMeasurement, {
      mappedBy: "product_measurement",
    }),
  })
  .indexes([
    {
      name: "IDX_product_measurement_product_id_unique",
      on: ["product_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_measurement_product_id_unit_id_unique",
      on: ["product_id", "measurement_unit_id"],
      unique: true,
    },
  ])

export default ProductMeasurement
