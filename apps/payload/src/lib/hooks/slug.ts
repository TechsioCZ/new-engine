import { isRecord } from "@techsio/std/object"

/** Convert a string into a URL-friendly slug. */
const generateSlug = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll(/[^\w\s-]/gu, "")
    .trim()
    .replaceAll(/\s+/gu, "-")
    .replaceAll(/-+/gu, "-")

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const resolveTitleFromMap = (
  titleMap: Record<string, unknown>,
  locale?: string | null,
): string | undefined => {
  if (locale !== undefined && locale !== null) {
    const localizedTitle = titleMap[locale]
    if (isNonEmptyString(localizedTitle)) {
      return localizedTitle
    }
  }

  const { en: englishTitle } = titleMap
  return isNonEmptyString(englishTitle)
    ? englishTitle
    : Object.values(titleMap).find(isNonEmptyString)
}

/** Generate a slug from a title or return the fallback value. */
export const generateSlugFromTitle = (
  title: unknown,
  options: { fallback?: string; locale?: string | null } = {},
): string => {
  const fallback = options.fallback ?? ""

  let resolvedTitle: string | undefined

  if (typeof title === "string") {
    resolvedTitle = title
  } else if (isRecord(title)) {
    resolvedTitle = resolveTitleFromMap(title, options.locale)
  }

  if (resolvedTitle !== undefined && resolvedTitle.trim().length > 0) {
    return generateSlug(resolvedTitle)
  }

  return fallback
}
