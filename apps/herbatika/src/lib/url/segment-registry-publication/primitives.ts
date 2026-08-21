import { createHash } from "node:crypto"
import { canonicalizePopulationValue } from "@/lib/url-registry/population/manifest-primitives"

export const PUBLICATION_SHA256 = /^[a-f0-9]{64}$/

export const publicationRecord = (
  value: unknown,
  label: string
): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

export const publicationExactKeys = (
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

export const publicationText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new Error(`${label} must be a nonblank trimmed string`)
  }
  return value
}

export const publicationSha256 = (value: unknown, label: string): string => {
  const parsed = publicationText(value, label)
  if (!PUBLICATION_SHA256.test(parsed)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}

export const canonicalPublicationJson = (value: unknown): string =>
  `${JSON.stringify(canonicalizePopulationValue(value))}\n`

export const hashPublicationBytes = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex")
