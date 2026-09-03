import { createHash } from "node:crypto"
import { canonicalizePopulationValue } from "../../src/lib/url-registry/population/manifest-primitives"

export const STATIC_CONTENT_SHA256 = /^[a-f0-9]{64}$/
export const STATIC_CONTENT_ID = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/

export const staticContentRecord = (
  value: unknown,
  label: string
): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

export const assertStaticContentExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string
) => {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} has invalid fields`)
  }
}

export const staticContentText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new Error(`${label} must be a nonblank trimmed string`)
  }
  return value
}

export const staticContentSha256 = (value: unknown, label: string): string => {
  const parsed = staticContentText(value, label)
  if (!STATIC_CONTENT_SHA256.test(parsed)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}

export const staticContentTimestamp = (
  value: unknown,
  label: string
): string => {
  const parsed = staticContentText(value, label)
  const date = new Date(parsed)
  if (Number.isNaN(date.getTime()) || date.toISOString() !== parsed) {
    throw new Error(`${label} must be a canonical ISO-8601 UTC timestamp`)
  }
  return parsed
}

export const canonicalStaticContentJson = (value: unknown): string =>
  `${JSON.stringify(canonicalizePopulationValue(value))}\n`

export const hashStaticContentBytes = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex")

export const parseStaticContentJson = (
  contents: string,
  label: string
): unknown => {
  try {
    return JSON.parse(contents)
  } catch {
    throw new Error(`${label} is not valid JSON`)
  }
}
