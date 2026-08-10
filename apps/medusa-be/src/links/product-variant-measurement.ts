import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"

import MeasurementUnitModule from "../modules/measurement-unit"
import { parseLinkSource } from "./parse-link-source"

const productModule = {
  linkable: {
    productVariant: parseLinkSource(
      ProductModule.linkable["productVariant"],
      "Product module product variant",
    ),
  },
}

export const ProductVariantMeasurementLink = defineLink(
  productModule.linkable.productVariant,
  {
    deleteCascade: true,
    linkable: MeasurementUnitModule.linkable.productVariantMeasurement,
  },
)
