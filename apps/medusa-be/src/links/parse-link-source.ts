import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { getRecordValue, isRecord, omitUndefined } from "@techsio/std/object"

const INVALID_LINK_SOURCE_CODE = "INVALID_LINK_SOURCE"
const INVALID_LINK_SOURCE_REASON = "linkable definition is invalid"

const SerializedLinkSourceSchema = z
  .object({
    alias: z.string().min(1).optional(),
    entity: z.string().min(1).optional(),
    field: z.string().min(1),
    filterable: z.array(z.string().min(1)).optional(),
    isList: z.boolean().optional(),
    linkable: z.string().min(1),
    primaryKey: z.string().min(1),
    readOnly: z.boolean().optional(),
    serviceName: z.string().min(1),
  })
  .transform(omitUndefined)

type SerializedLinkSource = z.infer<typeof SerializedLinkSourceSchema>

const invalidLinkSource = (context: string, reason: string): MedusaError =>
  new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `${context}: ${reason}`,
    INVALID_LINK_SOURCE_CODE,
  )

export const parseSerializedLinkSource = (
  value: unknown,
  context: string,
): SerializedLinkSource => {
  const parsed = SerializedLinkSourceSchema.safeParse(value)
  if (parsed.success) {
    return parsed.data
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
  const toJSON = getRecordValue(value, "toJSON")
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
  return parseSerializedLinkSource(getRecordValue(value, key), context)
}
