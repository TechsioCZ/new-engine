import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import MeasurementUnitModule from "../modules/measurement-unit"
import { parseLinkSource } from "./parse-link-source"

export const ProductVariantMeasurementLink = defineLink(
  parseLinkSource(
    ProductModule.linkable["productVariant"],
    "Product module product variant",
  ),
  {
    deleteCascade: true,
    linkable: MeasurementUnitModule.linkable.productVariantMeasurement,
  },
)
