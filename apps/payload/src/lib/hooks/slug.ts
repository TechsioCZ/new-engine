/** Convert a string into a URL-friendly slug. */
export const generateSlug = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

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
