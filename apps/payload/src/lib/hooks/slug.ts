/** Convert a string into a URL-friendly slug. */
export const generateSlug = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

/** Generate a slug from a title or return the fallback value. */
export const generateSlugFromTitle = (
  title: unknown,
  options: { fallback?: string; locale?: string } = {}
): string => {
  const fallback = options.fallback ?? ''
  const locale = options.locale

  let resolvedTitle: string | undefined

  if (typeof title === 'string') {
    resolvedTitle = title
  } else if (title && typeof title === 'object') {
    const titleMap = title as Record<string, unknown>

    if (locale) {
      const localized = titleMap[locale]
      if (typeof localized === 'string' && localized.trim().length > 0) {
        resolvedTitle = localized
      }
    }

    if (!resolvedTitle) {
      const firstAvailable = Object.values(titleMap).find(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
      if (typeof firstAvailable === 'string') {
        resolvedTitle = firstAvailable
      }
    }
  }

  if (resolvedTitle && resolvedTitle.trim().length > 0) {
    return generateSlug(resolvedTitle)
  }

  return fallback
}
