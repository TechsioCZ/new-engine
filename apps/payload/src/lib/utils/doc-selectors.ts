/** Minimal category document shape used in collection aggregation. */
export type CategoryDoc = {
  id: number
  title: string | null
  slug: string | null
}

/** Extract a category document from an unknown relationship value. */
export const getCategoryDoc = (category: unknown): CategoryDoc | null => {
  if (!category || typeof category !== 'object') {
    return null
  }

  const record = category as Record<string, unknown>
  const id = record.id
  if (typeof id !== 'number') {
    return null
  }

  return {
    id,
    title: typeof record.title === 'string' ? record.title : null,
    slug: typeof record.slug === 'string' ? record.slug : null,
  }
}

/** Resolve a media URL from an upload relationship value. */
export const getMediaUrl = (featuredImage: unknown): string | null => {
  if (!featuredImage || typeof featuredImage !== 'object') {
    return null
  }

  const record = featuredImage as Record<string, unknown>
  const url = record.url
  return typeof url === 'string' ? url : null
}
