import { MedusaError } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

const INVALID_LINK_SOURCE_CODE = "INVALID_LINK_SOURCE"
const INVALID_LINK_SOURCE_REASON = "linkable definition is invalid"
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

const invalidLinkSource = (context: string, reason: string): MedusaError =>
  new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `${context}: ${reason}`,
    INVALID_LINK_SOURCE_CODE,
  )

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

export const parseSerializedLinkSource = (
  value: unknown,
  context: string,
): SerializedLinkSource => {
  if (isSerializedLinkSource(value)) {
    return value
  }
  throw invalidLinkSource(context, INVALID_LINK_SOURCE_REASON)
}

export const parseLinkSource = (
  value: unknown,
  context: string,
): SerializedLinkSource => {
  if (!isRecord(value)) {
    throw invalidLinkSource(context, INVALID_LINK_SOURCE_REASON)
  }
  const { toJSON } = value
  if (typeof toJSON !== "function") {
    throw invalidLinkSource(context, INVALID_LINK_SOURCE_REASON)
  }

  let serialized: unknown
  try {
    serialized = Reflect.apply(toJSON, value, [])
  } catch (error) {
    const linkSourceError = invalidLinkSource(
      context,
      "linkable serialization failed",
    )
    linkSourceError.cause = error
    throw linkSourceError
  }
  return parseSerializedLinkSource(serialized, context)
}

export const parseNestedSerializedLinkSource = (
  value: unknown,
  key: string,
  context: string,
): SerializedLinkSource => {
  if (!isRecord(value)) {
    throw invalidLinkSource(context, INVALID_LINK_SOURCE_REASON)
  }
  return parseSerializedLinkSource(value[key], context)
}
