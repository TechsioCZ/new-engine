import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import MeasurementUnitModule from "../modules/measurement-unit"

export const ProductVariantMeasurementLink = defineLink(
  {
    linkable: ProductModule.linkable.productVariant,
    isList: true,
  },
  {
    linkable: MeasurementUnitModule.linkable.productVariantMeasurement,
    deleteCascade: true,
  }
)
