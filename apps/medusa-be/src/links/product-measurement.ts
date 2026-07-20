import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import MeasurementUnitModule from "../modules/measurement-unit"

export const ProductMeasurementLink = defineLink(
  {
    linkable: ProductModule.linkable.product,
    isList: true,
  },
  {
    linkable: MeasurementUnitModule.linkable.productMeasurement,
    deleteCascade: true,
  }
)
