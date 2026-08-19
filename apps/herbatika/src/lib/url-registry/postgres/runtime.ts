import { UrlRegistryError } from "../errors"

export type UnknownRecord = Readonly<Record<string, unknown>>
const UNSIGNED_INTEGER = /^\d+$/

export const asRecord = (value: unknown, label: string): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidResponse(`${label} must be an object`)
  }
  return value as UnknownRecord
}

export const asString = (value: unknown, label: string): string => {
  if (typeof value !== "string") {
    throw invalidResponse(`${label} must be a string`)
  }
  return value
}

export const asNullableString = (
  value: unknown,
  label: string
): string | null => (value === null ? null : asString(value, label))

export const asInteger = (value: unknown, label: string): number => {
  const number =
    typeof value === "string" && UNSIGNED_INTEGER.test(value)
      ? Number(value)
      : value
  if (typeof number !== "number" || !Number.isSafeInteger(number)) {
    throw invalidResponse(`${label} must be a safe integer`)
  }
  return number
}

export const asNullableInteger = (
  value: unknown,
  label: string
): number | null => (value === null ? null : asInteger(value, label))

export const asIsoTimestamp = (value: unknown, label: string): string => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString()
  }
  const text = asString(value, label)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.valueOf())) {
    throw invalidResponse(`${label} must be a timestamp`)
  }
  return parsed.toISOString()
}

export const asStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) {
    throw invalidResponse(`${label} must be an array`)
  }
  return value.map((entry, index) => asString(entry, `${label}[${index}]`))
}

export const oneOf = <Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  label: string
): Value => {
  if (typeof value !== "string" || !allowed.includes(value as Value)) {
    throw invalidResponse(`${label} has an unsupported value`)
  }
  return value as Value
}

export const invalidResponse = (message: string, cause?: unknown) =>
  new UrlRegistryError("INVARIANT_VIOLATION", message, {}, { cause })

export const isInvariantError = (error: unknown): boolean =>
  error instanceof UrlRegistryError && error.code === "INVARIANT_VIOLATION"
