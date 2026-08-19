const asNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null

export const extractLegacyPublicSlugs = (
  value: unknown
): Readonly<Record<string, string>> => {
  const projections: Record<string, string> = {}

  const visit = (candidate: unknown) => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        visit(item)
      }
      return
    }
    if (!(candidate && typeof candidate === "object")) {
      return
    }

    const record = candidate as Record<string, unknown>
    const sourceId =
      asNonEmptyString(record.sourceId) ?? asNonEmptyString(record.id)
    const publicSlug =
      asNonEmptyString(record.publicSlug) ??
      asNonEmptyString(record.slug) ??
      asNonEmptyString(record.handle)
    if (sourceId && publicSlug) {
      projections[sourceId] = publicSlug
    }

    for (const nested of Object.values(record)) {
      visit(nested)
    }
  }

  visit(value)
  return projections
}
