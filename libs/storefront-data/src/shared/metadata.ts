import { isRecord } from "@techsio/std/object"

export type StorefrontMetadataValue =
  | boolean
  | number
  | string
  | null
  | readonly StorefrontMetadataValue[]
  | { [key: string]: StorefrontMetadataValue }

export type StorefrontMetadata = Record<string, StorefrontMetadataValue>

const MAX_METADATA_DEPTH = 32

const isPlainMetadataObject = (value: unknown): value is object => {
  if (!isRecord(value)) {
    return false
  }
  const prototype = Reflect.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const isStorefrontMetadataValue = (
  value: unknown,
  depth: number,
): value is StorefrontMetadataValue => {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
  }
  if (depth >= MAX_METADATA_DEPTH) {
    return false
  }
  if (Array.isArray(value)) {
    return value.every((entry) => isStorefrontMetadataValue(entry, depth + 1))
  }
  if (!isPlainMetadataObject(value)) {
    return false
  }
  return Object.keys(value).every((key) =>
    isStorefrontMetadataValue(Reflect.get(value, key), depth + 1),
  )
}

export const isStorefrontMetadata = (
  value: unknown,
): value is StorefrontMetadata =>
  isPlainMetadataObject(value) &&
  Object.keys(value).every((key) =>
    isStorefrontMetadataValue(Reflect.get(value, key), 0),
  )

export const decodeStorefrontMetadata = (
  value: unknown,
  context = "Storefront metadata",
): StorefrontMetadata => {
  if (!isStorefrontMetadata(value)) {
    throw new TypeError(`${context} must be a JSON object`)
  }
  return value
}
