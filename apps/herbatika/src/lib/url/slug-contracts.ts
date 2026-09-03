export const MAX_PUBLISHED_SLUG_LENGTH = 255
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

export const messageForPublishedSlugError = (
  reason: PublishedSlugErrorReason,
  value: string
): string => {
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

export type ValidatePublishedSlugOptions = {
  existingSlugs?: Iterable<string>
}

export type CreatePublishedSlugOptions = ValidatePublishedSlugOptions & {
  locale: PublishedSlugLocale
}
