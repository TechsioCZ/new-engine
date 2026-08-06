import type { defineLink } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

type DefineLinkSource = Parameters<typeof defineLink>[0]

const REQUIRED_STRING_FIELDS = [
  "field",
  "linkable",
  "primaryKey",
  "serviceName",
] as const
const OPTIONAL_STRING_FIELDS = ["alias", "entity"] as const
const OPTIONAL_BOOLEAN_FIELDS = ["isList", "readOnly"] as const

interface SerializedLinkSource {
  alias?: string
  entity?: string
  field: string
  filterable?: string[]
  isList?: boolean
  linkable: string
  primaryKey: string
  readOnly?: boolean
  serviceName: string
}

const hasValidSerializedFields = (value: Record<string, unknown>): boolean => {
  const hasRequiredFields = REQUIRED_STRING_FIELDS.every((field) => {
    const { [field]: entry } = value
    return typeof entry === "string" && entry.length > 0
  })
  if (!hasRequiredFields) {
    return false
  }
  const hasValidOptionalStrings = OPTIONAL_STRING_FIELDS.every((field) => {
    const entry = value[field]
    return (
      entry === undefined || (typeof entry === "string" && entry.length > 0)
    )
  })
  const hasValidOptionalBooleans = OPTIONAL_BOOLEAN_FIELDS.every((field) => {
    const { [field]: entry } = value
    return entry === undefined || typeof entry === "boolean"
  })
  const { filterable } = value
  const hasValidFilterable =
    filterable === undefined ||
    (Array.isArray(filterable) &&
      filterable.every(
        (field) => typeof field === "string" && field.length > 0,
      ))
  return (
    hasValidOptionalStrings && hasValidOptionalBooleans && hasValidFilterable
  )
}

const isSerializedLinkSource = (
  value: unknown,
): value is SerializedLinkSource =>
  isRecord(value) && hasValidSerializedFields(value)

const isDefineLinkSource = (value: unknown): value is DefineLinkSource => {
  if (!isRecord(value)) {
    return false
  }
  const { toJSON } = value
  if (typeof toJSON !== "function") {
    return false
  }
  const serialized: unknown = Reflect.apply(toJSON, value, [])
  return isRecord(serialized) && hasValidSerializedFields(serialized)
}

export const parseLinkSource = (
  value: unknown,
  context: string,
): DefineLinkSource => {
  try {
    if (isDefineLinkSource(value)) {
      return value
    }
  } catch (error) {
    throw new TypeError(`${context} linkable serialization failed`, {
      cause: error,
    })
  }
  throw new TypeError(`${context} linkable definition is invalid`)
}

export const parseSerializedLinkSource = (
  value: unknown,
  context: string,
): SerializedLinkSource => {
  if (isSerializedLinkSource(value)) {
    return value
  }
  throw new TypeError(`${context} linkable definition is invalid`)
}

export const parseNestedSerializedLinkSource = (
  value: unknown,
  key: string,
  context: string,
): SerializedLinkSource => {
  if (!isRecord(value)) {
    throw new TypeError(`${context} linkable definition is invalid`)
  }
  return parseSerializedLinkSource(value[key], context)
}
