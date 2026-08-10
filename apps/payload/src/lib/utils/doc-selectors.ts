import { getRecordValue, isRecord } from "@techsio/std/object"

/** Minimal category document shape used in collection aggregation. */
export interface CategoryDoc {
  id: number
  slug: string | null
  title: string | null
}

/** Extract a category document from an unknown relationship value. */
export const getCategoryDoc = (category: unknown): CategoryDoc | null => {
  if (!isRecord(category)) {
    return null
  }

  const id = getRecordValue(category, "id")
  if (typeof id !== "number") {
    return null
  }

  const slug = getRecordValue(category, "slug")
  const title = getRecordValue(category, "title")
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

  const url = getRecordValue(featuredImage, "url")
  return typeof url === "string" ? url : null
}
