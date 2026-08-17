export const MAX_PUBLISHED_SLUG_LENGTH = 80
export const PUBLISHED_SLUG_TRANSLITERATION_VERSION = 1

export const SUPPORTED_PUBLISHED_SLUG_LOCALES = Object.freeze([
  "sk-SK",
  "cs-CZ",
  "hu-HU",
  "ro-RO",
] as const)

export type PublishedSlugLocale =
  (typeof SUPPORTED_PUBLISHED_SLUG_LOCALES)[number]

export const RESERVED_PUBLIC_PATH_SEGMENTS = Object.freeze([
  "api",
  "_next",
  "~sf",
  ".well-known",
  "robots.txt",
  "sitemap.xml",
  "sitemaps",
  "favicon.ico",
  "manifest.webmanifest",
  "feeds",
  "healthz",
  ".",
  "..",
] as const)

export type PublishedSlugErrorReason =
  | "empty"
  | "invalid-characters"
  | "too-long"
  | "reserved"
  | "collision"
  | "unsupported-locale"
  | "unmapped-latin-character"

export class PublishedSlugError extends Error {
  override readonly name = "PublishedSlugError"
  readonly reason: PublishedSlugErrorReason
  readonly value: string

  constructor(reason: PublishedSlugErrorReason, value: string) {
    super(messageForPublishedSlugError(reason, value))
    this.reason = reason
    this.value = value
  }
}

export type ValidatePublishedSlugOptions = {
  existingSlugs?: Iterable<string>
}

export type CreatePublishedSlugOptions = ValidatePublishedSlugOptions & {
  locale: PublishedSlugLocale
}

const SUPPORTED_LOCALE_SET: ReadonlySet<string> = new Set(
  SUPPORTED_PUBLISHED_SLUG_LOCALES
)
const RESERVED_SEGMENT_SET: ReadonlySet<string> = new Set(
  RESERVED_PUBLIC_PATH_SEGMENTS
)
const CANONICAL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const NON_ASCII_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g
const REPEATED_HYPHEN_PATTERN = /-+/g
const EDGE_HYPHEN_PATTERN = /^-+|-+$/g
const COMBINING_MARK_PATTERN = /\p{M}+/gu
const LATIN_CHARACTER_PATTERN = /\p{Script=Latin}/u

/**
 * Frozen language-specific table for the four storefront locales. Changing it
 * requires a new transliteration version and an explicit slug migration.
 */
const MARKET_TRANSLITERATION_V1: Readonly<Record<string, string>> = {
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

/** Characters that Unicode NFKD does not reduce to an ASCII Latin spelling. */
const OTHER_LATIN_FALLBACK_V1: Readonly<Record<string, string>> = {
  æ: "ae",
  đ: "d",
  ð: "d",
  ƒ: "f",
  ħ: "h",
  ı: "i",
  ĳ: "ij",
  ĸ: "k",
  ł: "l",
  ŀ: "l",
  ŋ: "n",
  œ: "oe",
  ø: "o",
  ſ: "s",
  ß: "ss",
  þ: "th",
  ŧ: "t",
}

function messageForPublishedSlugError(
  reason: PublishedSlugErrorReason,
  value: string
): string {
  switch (reason) {
    case "empty":
      return "Published slug cannot be empty after transliteration"
    case "invalid-characters":
      return `Published slug is not canonical: ${value}`
    case "too-long":
      return `Published slug exceeds ${MAX_PUBLISHED_SLUG_LENGTH} characters`
    case "reserved":
      return `Published slug is reserved: ${value}`
    case "collision":
      return `Published slug collides with immutable URL history: ${value}`
    case "unsupported-locale":
      return `Published slug locale is unsupported: ${value}`
    case "unmapped-latin-character":
      return `Published slug contains an unmapped Latin character: ${value}`
    default:
      throw new Error(`Unknown published slug error: ${reason satisfies never}`)
  }
}

function normalizeRomanianCedillas(value: string): string {
  return value
    .replaceAll("Ş", "Ș")
    .replaceAll("Ţ", "Ț")
    .replaceAll("ş", "ș")
    .replaceAll("ţ", "ț")
}

function transliterateMarketCharacters(value: string): string {
  return Array.from(
    value,
    (character) => MARKET_TRANSLITERATION_V1[character] ?? character
  ).join("")
}

function transliterateOtherLatinV1(value: string): string {
  const fallbackApplied = Array.from(
    value,
    (character) => OTHER_LATIN_FALLBACK_V1[character] ?? character
  )
    .join("")
    .normalize("NFKD")
    .replace(COMBINING_MARK_PATTERN, "")

  const unmappedCharacter = Array.from(fallbackApplied).find(
    (character) =>
      (character.codePointAt(0) ?? 0) > 127 &&
      LATIN_CHARACTER_PATTERN.test(character)
  )

  if (unmappedCharacter) {
    throw new PublishedSlugError("unmapped-latin-character", unmappedCharacter)
  }

  return fallbackApplied
}

function assertSupportedLocale(
  locale: string
): asserts locale is PublishedSlugLocale {
  if (!SUPPORTED_LOCALE_SET.has(locale)) {
    throw new PublishedSlugError("unsupported-locale", locale)
  }
}

function hasCollision(
  slug: string,
  existingSlugs: Iterable<string> | undefined
): boolean {
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

/** Validate a persisted canonical slug without rewriting it. */
export function validatePublishedSlug(
  slug: string,
  options: ValidatePublishedSlugOptions = {}
): string {
  if (slug.length === 0) {
    throw new PublishedSlugError("empty", slug)
  }
  if (slug.length > MAX_PUBLISHED_SLUG_LENGTH) {
    throw new PublishedSlugError("too-long", slug)
  }
  if (RESERVED_SEGMENT_SET.has(slug)) {
    throw new PublishedSlugError("reserved", slug)
  }
  if (!CANONICAL_SLUG_PATTERN.test(slug)) {
    throw new PublishedSlugError("invalid-characters", slug)
  }
  if (hasCollision(slug, options.existingSlugs)) {
    throw new PublishedSlugError("collision", slug)
  }

  return slug
}

/**
 * Create a slug only inside a publish or explicit SEO-slug edit transaction.
 * The result must be persisted; runtime request and rendering code must never
 * regenerate it from a title, label, or Medusa handle.
 */
export function createPublishedSlug(
  input: string,
  options: CreatePublishedSlugOptions
): string {
  assertSupportedLocale(options.locale)

  const normalized = normalizeRomanianCedillas(
    input.trim().normalize("NFKC")
  ).toLocaleLowerCase(options.locale)

  if (RESERVED_SEGMENT_SET.has(normalized)) {
    throw new PublishedSlugError("reserved", normalized)
  }

  const slug = transliterateOtherLatinV1(
    transliterateMarketCharacters(normalized)
  )
    .replace(NON_ASCII_ALPHANUMERIC_PATTERN, "-")
    .replace(REPEATED_HYPHEN_PATTERN, "-")
    .replace(EDGE_HYPHEN_PATTERN, "")

  return validatePublishedSlug(slug, options)
}
