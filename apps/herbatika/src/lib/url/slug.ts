export const MAX_SLUG_LENGTH = 80

export const RESERVED_SLUGS = [
  "api",
  "_next",
  "sitemap",
  "sitemap-index",
  "robots",
  "favicon",
  "assets",
  "static",
  "health",
  "__nextjs",
] as const

export type ReservedSlug = (typeof RESERVED_SLUGS)[number]
export type SlugErrorReason =
  | "empty"
  | "invalid-characters"
  | "too-long"
  | "reserved"
  | "collision"

export class SlugError extends Error {
  readonly name = "SlugError"
  readonly reason: SlugErrorReason
  readonly value: string

  constructor(reason: SlugErrorReason, value: string) {
    super(messageForSlugError(reason, value))
    this.reason = reason
    this.value = value
  }
}

export type ValidateSlugOptions = {
  existingSlugs?: Iterable<string>
}

const RESERVED_SLUG_SET = new Set<string>(RESERVED_SLUGS)
const CANONICAL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g
const REPEATED_HYPHEN_PATTERN = /-+/g
const EDGE_HYPHEN_PATTERN = /^-|-$/g

// Explicitly documents every non-ASCII letter used by the four supported languages.
const TRANSLITERATION: Readonly<Record<string, string>> = {
  á: "a",
  ä: "a",
  â: "a",
  ă: "a",
  č: "c",
  ď: "d",
  é: "e",
  ě: "e",
  í: "i",
  î: "i",
  ĺ: "l",
  ľ: "l",
  ň: "n",
  ó: "o",
  ô: "o",
  ö: "o",
  ő: "o",
  ŕ: "r",
  ř: "r",
  ș: "s",
  š: "s",
  ť: "t",
  ț: "t",
  ú: "u",
  ü: "u",
  ů: "u",
  ű: "u",
  ý: "y",
  ž: "z",
}

function messageForSlugError(reason: SlugErrorReason, value: string): string {
  switch (reason) {
    case "empty":
      return "Slug cannot be empty after transliteration"
    case "invalid-characters":
      return `Slug contains characters outside [a-z0-9-]: ${value}`
    case "too-long":
      return `Slug exceeds ${MAX_SLUG_LENGTH} characters`
    case "reserved":
      return `Slug is reserved: ${value}`
    case "collision":
      return `Slug already exists in this market and kind: ${value}`
    default:
      throw new Error(`Unknown slug error reason: ${reason satisfies never}`)
  }
}

function normalizeRomanianCedillas(value: string): string {
  return value.replaceAll("ş", "ș").replaceAll("ţ", "ț")
}

function transliterate(value: string): string {
  return Array.from(
    value,
    (character) => TRANSLITERATION[character] ?? character
  ).join("")
}

function hasCollision(slug: string, existingSlugs?: Iterable<string>): boolean {
  if (!existingSlugs) {
    return false
  }

  for (const existingSlug of existingSlugs) {
    if (existingSlug === slug) {
      return true
    }
  }

  return false
}

/** Validate an already-generated canonical slug without changing it. */
export function validateSlug(
  slug: string,
  options: ValidateSlugOptions = {}
): string {
  if (slug.length === 0) {
    throw new SlugError("empty", slug)
  }
  if (slug.length > MAX_SLUG_LENGTH) {
    throw new SlugError("too-long", slug)
  }
  if (RESERVED_SLUG_SET.has(slug)) {
    throw new SlugError("reserved", slug)
  }
  if (!CANONICAL_SLUG_PATTERN.test(slug)) {
    throw new SlugError("invalid-characters", slug)
  }
  if (hasCollision(slug, options.existingSlugs)) {
    throw new SlugError("collision", slug)
  }

  return slug
}

/**
 * Generate an ASCII slug. This is a publication-time operation; callers must
 * persist its result rather than regenerating it when an entity is read.
 */
export function slugify(
  input: string,
  options: ValidateSlugOptions = {}
): string {
  const normalized = normalizeRomanianCedillas(
    input.normalize("NFC").toLowerCase()
  )
  if (RESERVED_SLUG_SET.has(normalized)) {
    throw new SlugError("reserved", normalized)
  }

  const slug = transliterate(normalized)
    .replace(NON_ALPHANUMERIC_PATTERN, "-")
    .replace(REPEATED_HYPHEN_PATTERN, "-")
    .replace(EDGE_HYPHEN_PATTERN, "")

  return validateSlug(slug, options)
}
