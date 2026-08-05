import { model } from "@medusajs/framework/utils"

import ProductMeasurement from "./product-measurement"

const MeasurementUnit = model
  .define("measurement_unit", {
    base_quantity: model.bigNumber(),
    code: model.text().searchable(),
    description: model.text().translatable().nullable(),
    id: model.id().primaryKey(),
    name: model.text().searchable().translatable(),
    product_measurements: model.hasMany(() => ProductMeasurement, {
      mappedBy: "measurement_unit",
    }),
    symbol: model.text().searchable().translatable(),
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
      expression: (columns) => `${columns.base_quantity} > 0`,
      name: "measurement_unit_base_quantity_positive",
    },
  ])

export default MeasurementUnit
