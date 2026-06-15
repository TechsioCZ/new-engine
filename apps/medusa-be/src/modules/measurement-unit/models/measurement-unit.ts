import { model } from "@medusajs/framework/utils"
import ProductMeasurement from "./product-measurement"

const MeasurementUnit = model
  .define("measurement_unit", {
    id: model.id().primaryKey(),
    code: model.text().searchable(),
    name: model.text().searchable().translatable(),
    symbol: model.text().searchable().translatable(),
    description: model.text().translatable().nullable(),
    productMeasurements: model.hasMany(() => ProductMeasurement, {
      mappedBy: "measurementUnit",
    }),
  })
  .indexes([
    {
      name: "IDX_measurement_unit_code_unique",
      on: ["code"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default MeasurementUnit
