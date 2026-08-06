import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import { isRecord } from "@techsio/std/object"

import ProductListModule from "../modules/product-list"

interface ProductLinkSource {
  entity?: string
  field: string
  linkable: string
  primaryKey: string
  serviceName: string
}

const parseProductLinkSource = (value: unknown): ProductLinkSource => {
  if (!isRecord(value)) {
    throw new TypeError("Product Module product linkable definition is invalid")
  }

  const { entity, field, linkable, primaryKey, serviceName } = value
  if (typeof field !== "string") {
    throw new TypeError("Product Module product linkable field is invalid")
  }
  if (typeof linkable !== "string") {
    throw new TypeError("Product Module product linkable key is invalid")
  }
  if (typeof primaryKey !== "string") {
    throw new TypeError("Product Module product primary key is invalid")
  }
  if (typeof serviceName !== "string") {
    throw new TypeError("Product Module product service name is invalid")
  }
  if (entity !== undefined && typeof entity !== "string") {
    throw new TypeError("Product Module product entity is invalid")
  }

  return {
    ...(entity === undefined ? {} : { entity }),
    field,
    linkable,
    primaryKey,
    serviceName,
  }
}

const rawProductLinkable: unknown = ProductModule.linkable["product"]
if (
  !isRecord(rawProductLinkable) ||
  typeof rawProductLinkable["toJSON"] !== "function"
) {
  throw new TypeError(
    "Product Module product linkable definition is unavailable",
  )
}
const productLinkable = parseProductLinkSource(
  Reflect.apply(rawProductLinkable["toJSON"], rawProductLinkable, []),
)

export const ProductListItemProductLink = defineLink(
  {
    isList: true,
    linkable: ProductListModule.linkable.productListItem,
  },
  {
    filterable: ["id", "title", "handle"],
    linkable: productLinkable,
  },
)
