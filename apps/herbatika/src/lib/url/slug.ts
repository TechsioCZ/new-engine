import {
  type CreatePublishedSlugOptions as CreatePublishedSlugOptionsContract,
  MAX_PUBLISHED_SLUG_LENGTH as MAX_PUBLISHED_SLUG_LENGTH_VALUE,
  messageForPublishedSlugError,
  PUBLISHED_SLUG_TRANSLITERATION_VERSION as PUBLISHED_SLUG_TRANSLITERATION_VERSION_VALUE,
  type PublishedSlugErrorReason as PublishedSlugErrorReasonContract,
  type PublishedSlugLocale as PublishedSlugLocaleContract,
  RESERVED_PUBLIC_PATH_SEGMENTS as RESERVED_PUBLIC_PATH_SEGMENTS_VALUE,
  SUPPORTED_PUBLISHED_SLUG_LOCALES as SUPPORTED_PUBLISHED_SLUG_LOCALES_VALUE,
  type ValidatePublishedSlugOptions as ValidatePublishedSlugOptionsContract,
} from "./slug-contracts"
import {
  applyTransliterationTable,
  normalizeDecomposedLatin,
} from "./slug-transliteration-v1"

export const MAX_PUBLISHED_SLUG_LENGTH = MAX_PUBLISHED_SLUG_LENGTH_VALUE
export const PUBLISHED_SLUG_TRANSLITERATION_VERSION =
  PUBLISHED_SLUG_TRANSLITERATION_VERSION_VALUE
export const RESERVED_PUBLIC_PATH_SEGMENTS = RESERVED_PUBLIC_PATH_SEGMENTS_VALUE
export const SUPPORTED_PUBLISHED_SLUG_LOCALES =
  SUPPORTED_PUBLISHED_SLUG_LOCALES_VALUE
export type PublishedSlugLocale = PublishedSlugLocaleContract
export type PublishedSlugErrorReason = PublishedSlugErrorReasonContract
export type ValidatePublishedSlugOptions = ValidatePublishedSlugOptionsContract
export type CreatePublishedSlugOptions = CreatePublishedSlugOptionsContract

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

function normalizeRomanianCedillas(value: string): string {
  return value
    .replaceAll("Ş", "Ș")
    .replaceAll("Ţ", "Ț")
    .replaceAll("ş", "ș")
    .replaceAll("ţ", "ț")
}

function transliterateMarketCharacters(value: string): string {
  return applyTransliterationTable(value, MARKET_TRANSLITERATION_V1)
}

function transliterateOtherLatinV1(value: string): string {
  const { normalized, unmappedCharacter } = normalizeDecomposedLatin(
    value,
    OTHER_LATIN_FALLBACK_V1
  )

  if (unmappedCharacter) {
    throw new PublishedSlugError("unmapped-latin-character", unmappedCharacter)
  }

  return normalized
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
