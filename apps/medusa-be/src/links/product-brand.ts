import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import { isRecord } from "@techsio/std/object"

import BrandModule from "../modules/brand"

const productLinkable: unknown = ProductModule.linkable["product"]
if (!isRecord(productLinkable)) {
  throw new TypeError("Product module linkable metadata is invalid")
}
const productIdLinkable = productLinkable["id"]
if (!isRecord(productIdLinkable)) {
  throw new TypeError("Product module id linkable metadata is invalid")
}
const { field, linkable, primaryKey, serviceName } = productIdLinkable
if (typeof field !== "string") {
  throw new TypeError("Product module linkable field is invalid")
}
if (typeof linkable !== "string") {
  throw new TypeError("Product module linkable name is invalid")
}
if (typeof primaryKey !== "string") {
  throw new TypeError("Product module linkable primary key is invalid")
}
if (typeof serviceName !== "string") {
  throw new TypeError("Product module linkable service name is invalid")
}
const validatedProductLinkable = {
  ...productIdLinkable,
  field,
  linkable,
  primaryKey,
  serviceName,
}

export const ProductBrandLink = defineLink(
  {
    isList: true,
    linkable: validatedProductLinkable,
  },
  {
    filterable: ["id", "title", "handle"],
    linkable: BrandModule.linkable.brand,
  },
)
