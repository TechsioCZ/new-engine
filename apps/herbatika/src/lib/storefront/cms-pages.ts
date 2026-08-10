import { isRecord, getRecordValue } from "@techsio/std/object"

import { fetchCmsJson, rewriteCmsHtmlMediaUrls } from "./cms-client"
import type { CmsMediaValue, CmsPage } from "./cms-types"

const readString = (record: object, key: string): string | null => {
  const value = getRecordValue(record, key)
  return typeof value === "string" ? value : null
}

const parseMedia = (value: unknown): CmsMediaValue => {
  if (typeof value === "string") {
    return value
  }
  if (!isRecord(value)) {
    return null
  }

  return {
    alt: readString(value, "alt"),
    url: readString(value, "url"),
  }
}

const parseCmsPage = (value: unknown): CmsPage | null => {
  if (!isRecord(value)) {
    return null
  }
  const id = getRecordValue(value, "id")
  if (typeof id !== "string" && typeof id !== "number") {
    return null
  }

  const metaValue = getRecordValue(value, "meta")
  const meta = isRecord(metaValue)
    ? {
        description: readString(metaValue, "description"),
        image: parseMedia(getRecordValue(metaValue, "image")),
        title: readString(metaValue, "title"),
      }
    : null

  return {
    content: readString(value, "content"),
    id,
    meta,
    publishedDate: readString(value, "publishedDate"),
    slug: readString(value, "slug"),
    title: readString(value, "title"),
  }
}

export const fetchCmsPageBySlug = async (
  slug: string,
): Promise<CmsPage | null> => {
  const response = await fetchCmsJson(`pages/${encodeURIComponent(slug)}`)
  const page = isRecord(response)
    ? parseCmsPage(getRecordValue(response, "page"))
    : null

  if (page === null) {
    return null
  }
  if (page.slug === null || page.slug === undefined || page.slug.length === 0) {
    return null
  }
  if (
    page.title === null ||
    page.title === undefined ||
    page.title.length === 0
  ) {
    return null
  }

  return {
    ...page,
    content: rewriteCmsHtmlMediaUrls(page.content ?? ""),
  }
}
