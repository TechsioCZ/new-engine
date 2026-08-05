import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import MeasurementUnitModule from "../modules/measurement-unit"

export const ProductVariantMeasurementLink = defineLink(
  ProductModule.linkable["productVariant"],
  {
    deleteCascade: true,
    linkable: MeasurementUnitModule.linkable.productVariantMeasurement,
  },
)
