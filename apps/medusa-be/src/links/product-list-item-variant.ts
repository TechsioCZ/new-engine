import { defineLink, MedusaError } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import { isRecord } from "@techsio/std/object"

import ProductListModule from "../modules/product-list"

const getRequiredLinkableString = (
  value: Record<string, unknown>,
  key: string,
): string => {
  const entry = value[key]
  if (typeof entry !== "string") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product variant linkable definition is invalid",
    )
  }
  return entry
}

const getProductVariantLinkable = () => {
  const linkableValue: unknown = ProductModule.linkable["productVariant"]
  if (!isRecord(linkableValue)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product variant linkable definition is unavailable",
    )
  }

  const { toJSON } = linkableValue
  if (typeof toJSON !== "function") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product variant linkable definition cannot be serialized",
    )
  }

  const serialized: unknown = Reflect.apply(toJSON, linkableValue, [])
  if (!isRecord(serialized)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product variant linkable definition is invalid",
    )
  }

  const field = getRequiredLinkableString(serialized, "field")
  const linkable = getRequiredLinkableString(serialized, "linkable")
  const primaryKey = getRequiredLinkableString(serialized, "primaryKey")
  const serviceName = getRequiredLinkableString(serialized, "serviceName")

  return {
    field,
    linkable,
    primaryKey,
    serviceName,
    ...(typeof serialized["alias"] === "string"
      ? { alias: serialized["alias"] }
      : {}),
    ...(typeof serialized["entity"] === "string"
      ? { entity: serialized["entity"] }
      : {}),
    ...(Array.isArray(serialized["filterable"]) &&
    serialized["filterable"].every(
      (filterField) => typeof filterField === "string",
    )
      ? { filterable: serialized["filterable"] }
      : {}),
  }
}

export const ProductListItemVariantLink = defineLink(
  {
    isList: true,
    linkable: ProductListModule.linkable.productListItem,
  },
  {
    filterable: ["id", "sku", "title"],
    linkable: getProductVariantLinkable(),
  },
)
