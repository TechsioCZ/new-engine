import { model } from "@medusajs/framework/utils"
import ProductMeasurement from "./product-measurement"

const MeasurementUnit = model
  .define("measurement_unit", {
    id: model.id().primaryKey(),
    base_quantity: model.bigNumber(),
    code: model.text().searchable(),
    name: model.text().searchable().translatable(),
    symbol: model.text().searchable().translatable(),
    description: model.text().translatable().nullable(),
    product_measurements: model.hasMany(() => ProductMeasurement, {
      mappedBy: "measurement_unit",
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
  .checks([
    {
      name: "measurement_unit_base_quantity_positive",
      expression: (columns) => `${columns.base_quantity} > 0`,
    },
  ])

export default MeasurementUnit
