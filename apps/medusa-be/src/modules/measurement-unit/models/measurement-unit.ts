import { model } from "@medusajs/framework/utils"

let productMeasurementReference: typeof ProductMeasurement
let productVariantMeasurementReference: typeof ProductVariantMeasurement

const ACTIVE_INDEX_PREDICATE = "deleted_at IS NULL"
const DELETED_INDEX_PREDICATE = "deleted_at IS NOT NULL"

export const MeasurementUnit = model
  .define("measurement_unit", {
    base_quantity: model.bigNumber(),
    code: model.text().searchable(),
    description: model.text().translatable().nullable(),
    id: model.id().primaryKey(),
    name: model.text().searchable().translatable(),
    product_measurements: model.hasMany(() => productMeasurementReference, {
      mappedBy: "measurement_unit",
    }),
    symbol: model.text().searchable().translatable(),
  })
  .indexes([
    {
      name: "IDX_measurement_unit_code_unique",
      on: ["code"],
      unique: true,
      where: ACTIVE_INDEX_PREDICATE,
    },
  ])
  .checks([
    {
      expression: (columns) => `${columns.base_quantity} > 0`,
      name: "measurement_unit_base_quantity_positive",
    },
  ])

export const ProductMeasurement = model
  .define("product_measurement", {
    id: model.id().primaryKey(),
    measurement_unit: model.belongsTo(() => MeasurementUnit, {
      mappedBy: "product_measurements",
    }),
    product_id: model.text().searchable(),
    variant_measurements: model.hasMany(
      () => productVariantMeasurementReference,
      {
        mappedBy: "product_measurement",
      },
    ),
  })
  .indexes([
    {
      name: "IDX_product_measurement_product_id_unique",
      on: ["product_id"],
      unique: true,
      where: ACTIVE_INDEX_PREDICATE,
    },
    {
      name: "IDX_product_measurement_product_unit_deleted_unique",
      on: ["product_id", "measurement_unit_id"],
      unique: true,
      where: DELETED_INDEX_PREDICATE,
    },
    {
      name: "IDX_product_measurement_unit_id_deleted",
      on: ["measurement_unit_id"],
      where: DELETED_INDEX_PREDICATE,
    },
  ])

export const ProductVariantMeasurement = model
  .define("product_variant_measurement", {
    id: model.id().primaryKey(),
    product_measurement: model.belongsTo(() => ProductMeasurement, {
      mappedBy: "variant_measurements",
    }),
    product_unit_quantity: model.bigNumber(),
    product_variant_id: model.text().searchable(),
  })
  .indexes([
    {
      name: "IDX_product_variant_measurement_variant_id_unique",
      on: ["product_variant_id"],
      unique: true,
      where: ACTIVE_INDEX_PREDICATE,
    },
    {
      name: "IDX_product_variant_measurement_variant_product_deleted_unique",
      on: ["product_variant_id", "product_measurement_id"],
      unique: true,
      where: DELETED_INDEX_PREDICATE,
    },
    {
      name: "IDX_product_variant_measurement_product_id_deleted",
      on: ["product_measurement_id"],
      where: DELETED_INDEX_PREDICATE,
    },
  ])
  .checks([
    {
      expression: (columns) => `${columns.product_unit_quantity} > 0`,
      name: "product_variant_measurement_quantity_positive",
    },
  ])

const initializeMeasurementModelReferences = () => {
  productMeasurementReference = ProductMeasurement
  productVariantMeasurementReference = ProductVariantMeasurement
}

initializeMeasurementModelReferences()
