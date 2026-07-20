import { model } from "@medusajs/framework/utils"
import ProductMeasurement from "./product-measurement"

const ProductVariantMeasurement = model
  .define("product_variant_measurement", {
    id: model.id().primaryKey(),
    product_variant_id: model.text().searchable(),
    product_unit_quantity: model.bigNumber(),
    product_measurement: model.belongsTo(() => ProductMeasurement, {
      mappedBy: "variant_measurements",
    }),
  })
  .indexes([
    {
      name: "IDX_product_variant_measurement_variant_id_unique",
      on: ["product_variant_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_variant_measurement_variant_id_product_measurement_id_unique",
      on: ["product_variant_id", "product_measurement_id"],
      unique: true,
    },
  ])
  .checks([
    {
      name: "product_variant_measurement_quantity_positive",
      expression: (columns) => `${columns.product_unit_quantity} > 0`,
    },
  ])

export default ProductVariantMeasurement
