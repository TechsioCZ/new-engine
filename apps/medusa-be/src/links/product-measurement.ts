import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import MeasurementUnitModule from "../modules/measurement-unit"
import { parseLinkSource } from "./parse-link-source"

const productModule = {
  linkable: {
    product: parseLinkSource(
      ProductModule.linkable["product"],
      "Product module product",
    ),
  },
}

export const ProductMeasurementLink = defineLink(
  productModule.linkable.product,
  {
    deleteCascade: true,
    filterable: ["id", "measurement_unit_id"],
    linkable: MeasurementUnitModule.linkable.productMeasurement,
  },
)
