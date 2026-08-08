import { getRecordValue, isRecord } from "@techsio/std/object"

import type {
  CmsArticle,
  CmsArticleCategory,
  CmsCategory,
  CmsMediaValue,
} from "./cms-types"

const readString = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): string | null => {
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

const parseCategory = (value: unknown): CmsCategory | null => {
  if (!isRecord(value)) {
    return null
  }
  const id = getRecordValue(value, "id")
  if (typeof id !== "string" && typeof id !== "number") {
    return null
  }
  return {
    id,
    slug: readString(value, "slug"),
    title: readString(value, "title"),
  }
}

export const parseCmsArticleCategory = (
  value: unknown,
): CmsArticleCategory | null => {
  const category = parseCategory(value)
  if (category === null || !isRecord(value)) {
    return null
  }
  const articlesValue = getRecordValue(value, "articles")
  const rawArticles = Array.isArray(articlesValue) ? articlesValue : []
  const articles = rawArticles.flatMap((article) => {
    if (!isRecord(article)) {
      return []
    }
    return [{ slug: readString(article, "slug") }]
  })
  return { ...category, articles }
}

export const parseCmsArticle = (value: unknown): CmsArticle | null => {
  if (!isRecord(value)) {
    return null
  }
  const id = getRecordValue(value, "id")
  if (typeof id !== "string" && typeof id !== "number") {
    return null
  }
  const authorValue = getRecordValue(value, "author")
  const rawAuthor = isRecord(authorValue) ? authorValue : null
  const tagsValue = getRecordValue(value, "tags")
  const rawTags = Array.isArray(tagsValue) ? tagsValue : []
  const readingTimeValue = getRecordValue(value, "readingTime")

  return {
    author:
      rawAuthor === null
        ? null
        : {
            firstName: readString(rawAuthor, "firstName"),
            lastName: readString(rawAuthor, "lastName"),
          },
    category: parseCategory(getRecordValue(value, "category")),
    content: readString(value, "content"),
    excerpt: readString(value, "excerpt"),
    featuredImage: parseMedia(getRecordValue(value, "featuredImage")),
    id,
    publishedDate: readString(value, "publishedDate"),
    readingTime: typeof readingTimeValue === "number" ? readingTimeValue : null,
    slug: readString(value, "slug"),
    tags: rawTags.filter((tag): tag is string => typeof tag === "string"),
    title: readString(value, "title"),
  }
}
