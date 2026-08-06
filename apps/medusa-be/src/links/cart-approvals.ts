import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"
import { isRecord } from "@techsio/std/object"

import ApprovalModule from "../modules/approval"

type DefineLinkSource = Parameters<typeof defineLink>[0]

const isDefineLinkSource = (value: unknown): value is DefineLinkSource => {
  if (!isRecord(value) || typeof value["toJSON"] !== "function") {
    return false
  }

  const { toJSON } = value
  const serialized: unknown = Reflect.apply(toJSON, value, [])
  if (!isRecord(serialized)) {
    return false
  }

  const hasField = typeof serialized["field"] === "string"
  const hasLinkable = typeof serialized["linkable"] === "string"
  const hasPrimaryKey = typeof serialized["primaryKey"] === "string"
  const hasServiceName = typeof serialized["serviceName"] === "string"
  return hasField && hasLinkable && hasPrimaryKey && hasServiceName
}

const cartLinkable: unknown = CartModule.linkable["cart"]
if (!isDefineLinkSource(cartLinkable)) {
  throw new TypeError("Medusa cart module did not expose a valid cart linkable")
}

export default defineLink(cartLinkable, {
  deleteCascade: true,
  isList: true,
  linkable: ApprovalModule.linkable.approval,
})
