import { z } from "zod"

/** Trim string values and normalize empty strings to undefined. */
const trimOrUndefined = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

/** Convert numeric string values to numbers, leaving invalid values unchanged. */
const toOptionalNumber = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const numberValue = Number(trimmed)
  return Number.isNaN(numberValue) ? value : numberValue
}

/** Zod schema for optional string query parameters. */
export const optionalStringParam = z.preprocess(
  trimOrUndefined,
  z.string().optional()
)

/** Zod schema for optional positive integer query parameters. */
export const optionalPositiveIntParam = z.preprocess(
  toOptionalNumber,
  z.number().int().positive().optional()
)
