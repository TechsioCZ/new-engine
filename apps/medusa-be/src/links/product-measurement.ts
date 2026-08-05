import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import MeasurementUnitModule from "../modules/measurement-unit"

export const ProductMeasurementLink = defineLink(
  ProductModule.linkable["product"],
  {
    deleteCascade: true,
    filterable: ["id", "measurement_unit_id"],
    linkable: MeasurementUnitModule.linkable.productMeasurement,
  },
)
