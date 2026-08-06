import { MedusaError, defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import ProductListModule from "../modules/product-list"

interface LinkInputSource {
  entity?: string
  field: string
  linkable: string
  primaryKey: string
  serviceName: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isLinkInputSource = (value: unknown): value is LinkInputSource => {
  if (!isRecord(value)) {
    return false
  }

  const { entity, field, linkable, primaryKey, serviceName } = value
  if (entity !== undefined && typeof entity !== "string") {
    return false
  }
  return [field, linkable, primaryKey, serviceName].every(
    (property) => typeof property === "string",
  )
}

const getCustomerLinkSource = (): LinkInputSource => {
  const customerModule: unknown = CustomerModule
  const linkable: unknown = isRecord(customerModule)
    ? customerModule["linkable"]
    : undefined
  const customerLinkable: unknown = isRecord(linkable)
    ? linkable["customer"]
    : undefined
  if (!isRecord(customerLinkable)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Customer module did not provide a customer link source",
    )
  }

  const toJson = customerLinkable["toJSON"]
  const source: unknown =
    typeof toJson === "function"
      ? Reflect.apply(toJson, customerLinkable, [])
      : customerLinkable
  if (!isLinkInputSource(source)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Customer module returned an invalid customer link source",
    )
  }

  return source
}

export const CustomerProductListLink = defineLink(getCustomerLinkSource(), {
  filterable: ["id", "type", "handle"],
  isList: true,
  linkable: ProductListModule.linkable.productList,
})
