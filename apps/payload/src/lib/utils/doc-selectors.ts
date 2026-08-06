import { isRecord } from "@techsio/std/object"

/** Minimal category document shape used in collection aggregation. */
export interface CategoryDoc {
  id: number
  title: string | null
  slug: string | null
}

/** Extract a category document from an unknown relationship value. */
export const getCategoryDoc = (category: unknown): CategoryDoc | null => {
  if (!isRecord(category)) {
    return null
  }

  const { id, slug, title } = category
  if (typeof id !== "number") {
    return null
  }

  return {
    id,
    slug: typeof slug === "string" ? slug : null,
    title: typeof title === "string" ? title : null,
  }
}

/** Resolve a media URL from an upload relationship value. */
export const getMediaUrl = (featuredImage: unknown): string | null => {
  if (!isRecord(featuredImage)) {
    return null
  }

  const { url } = featuredImage
  return typeof url === "string" ? url : null
}
