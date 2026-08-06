import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"
import { isRecord } from "@techsio/std/object"

import CompanyModule from "../modules/company"

const rawCartLinkable: unknown = CartModule.linkable["cart"]

if (!isRecord(rawCartLinkable)) {
  throw new TypeError("Cart module linkable definition is invalid")
}

const serializeCartLinkable = rawCartLinkable["toJSON"]

if (typeof serializeCartLinkable !== "function") {
  throw new TypeError("Cart module linkable serializer is invalid")
}

const serializedCartLinkable: unknown = Reflect.apply(
  serializeCartLinkable,
  rawCartLinkable,
  [],
)

if (!isRecord(serializedCartLinkable)) {
  throw new TypeError("Serialized cart linkable definition is invalid")
}

if (
  typeof serializedCartLinkable["field"] !== "string" ||
  typeof serializedCartLinkable["linkable"] !== "string" ||
  typeof serializedCartLinkable["primaryKey"] !== "string"
) {
  throw new TypeError("Serialized cart linkable fields are invalid")
}

if (typeof serializedCartLinkable["serviceName"] !== "string") {
  throw new TypeError("Serialized cart linkable service name is invalid")
}

const cartLinkable = {
  field: serializedCartLinkable["field"],
  linkable: serializedCartLinkable["linkable"],
  primaryKey: serializedCartLinkable["primaryKey"],
  serviceName: serializedCartLinkable["serviceName"],
  ...(typeof serializedCartLinkable["entity"] === "string"
    ? { entity: serializedCartLinkable["entity"] }
    : {}),
}

export default defineLink(CompanyModule.linkable.company, {
  isList: true,
  linkable: cartLinkable,
})
