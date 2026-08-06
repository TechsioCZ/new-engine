import { isRecord } from "@techsio/std/object"

export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (isRecord(value)) {
    return value
  }

  return null
}

export const readRecordProperty = (
  record: Record<string, unknown> | null | undefined,
  key: string,
): unknown => record?.[key]

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null

export const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

export const asBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null
