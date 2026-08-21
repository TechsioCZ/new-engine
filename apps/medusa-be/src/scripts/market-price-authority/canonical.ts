import { createHash } from "node:crypto"

type JsonRecord = Record<string, unknown>

const compareText = (left: string, right: string) => {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

export const canonicalJson = (value: unknown): string => {
  const seen = new WeakSet<object>()
  const visit = (item: unknown): string => {
    if (typeof item === "number") {
      if (!Number.isFinite(item) || Object.is(item, -0)) {
        throw new Error("market price artifact contains a non-JSON number")
      }
      return JSON.stringify(item)
    }
    if (Array.isArray(item)) {
      if (seen.has(item)) {
        throw new Error("market price artifact contains a cycle")
      }
      if (
        Array.from({ length: item.length }, (_, index) => index).some(
          (index) => !Object.hasOwn(item, index)
        )
      ) {
        throw new Error("market price artifact contains a sparse array")
      }
      seen.add(item)
      const result = `[${item.map(visit).join(",")}]`
      seen.delete(item)
      return result
    }
    if (item && typeof item === "object") {
      const prototype = Object.getPrototypeOf(item)
      if (!(prototype === Object.prototype || prototype === null)) {
        throw new Error("market price artifact contains a non-plain object")
      }
      if (seen.has(item)) {
        throw new Error("market price artifact contains a cycle")
      }
      const descriptors = Object.getOwnPropertyDescriptors(item)
      if (
        Object.values(descriptors).some(
          (descriptor) => descriptor.get || descriptor.set
        )
      ) {
        throw new Error("market price artifact contains an accessor")
      }
      seen.add(item)
      const result = `{${Object.entries(item as JsonRecord)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, child]) => `${JSON.stringify(key)}:${visit(child)}`)
        .join(",")}}`
      seen.delete(item)
      return result
    }
    const serialized = JSON.stringify(item)
    if (serialized === undefined) {
      throw new Error("market price artifact contains a non-JSON value")
    }
    return serialized
  }
  return visit(value)
}

export const canonicalJsonLine = (value: unknown): string =>
  `${canonicalJson(value)}\n`

export const sha256Bytes = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex")

export const compareMarketPriceIdentity = (
  left: Readonly<{ marketCode: string; productId: string; variantId: string }>,
  right: Readonly<{ marketCode: string; productId: string; variantId: string }>
) =>
  compareText(
    `${left.marketCode}\u0000${left.productId}\u0000${left.variantId}`,
    `${right.marketCode}\u0000${right.productId}\u0000${right.variantId}`
  )
