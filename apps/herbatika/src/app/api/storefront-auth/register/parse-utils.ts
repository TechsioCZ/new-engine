import { isRecord } from "@techsio/std/object"

export const asStringOrUndefined = (value: unknown) => {
  let normalizedValue: string | undefined

  if (typeof value === "string") {
    const trimmed = value.trim()
    normalizedValue = trimmed.length > 0 ? trimmed : undefined
  }

  return normalizedValue
}

export const asRecordOrUndefined = (value: unknown) =>
  isRecord(value) ? value : undefined
