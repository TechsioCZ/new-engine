const MAX_URL_SLUG_LENGTH = 80
const CANONICAL_URL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const RESERVED_URL_SLUGS = new Set([
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
])

/** Convert a string into the same canonical slug shape accepted by URLR. */
export const generateSlug = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

/** Payload field validator that fails before URL-registry synchronization. */
export const validateUrlRegistrySlug = (value: unknown): true | string => {
  if (typeof value !== "string" || !value) {
    return "Slug is required."
  }
  if (value.length > MAX_URL_SLUG_LENGTH) {
    return `Slug must be at most ${MAX_URL_SLUG_LENGTH} characters.`
  }
  if (RESERVED_URL_SLUGS.has(value)) {
    return "This slug is reserved by the storefront."
  }
  if (!CANONICAL_URL_SLUG_PATTERN.test(value)) {
    return "Slug may contain only lowercase letters, numbers, and single hyphens."
  }
  return true
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const resolveTitleFromMap = (
  titleMap: Record<string, unknown>,
  locale?: string | null
): string | undefined => {
  if (locale && isNonEmptyString(titleMap[locale])) {
    return titleMap[locale]
  }

  return Object.values(titleMap).find(isNonEmptyString)
}

/** Generate a slug from a title or return the fallback value. */
export const generateSlugFromTitle = (
  title: unknown,
  options: { fallback?: string; locale?: string | null } = {}
): string => {
  const fallback = options.fallback ?? ""

  let resolvedTitle: string | undefined

  if (typeof title === "string") {
    resolvedTitle = title
  } else if (title && typeof title === "object") {
    resolvedTitle = resolveTitleFromMap(
      title as Record<string, unknown>,
      options.locale
    )
  }

  if (resolvedTitle && resolvedTitle.trim().length > 0) {
    return generateSlug(resolvedTitle)
  }

  return fallback
}
