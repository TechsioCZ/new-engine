import { isRecord, getRecordValue } from "@techsio/std/object"

import type { BlogPost, BlogTopicKey } from "@/lib/storefront/blog-content"

import {
  fetchCmsJson,
  resolveCmsMediaUrl,
  rewriteCmsHtmlMediaUrls,
  stripCmsHtml,
} from "./cms-client"
import type {
  CmsArticle,
  CmsArticleCategory,
  CmsBlogTopic,
  CmsCategory,
  CmsMediaValue,
} from "./cms-types"

const DEFAULT_CMS_TOPIC: CmsBlogTopic = "zdravie"
const DEFAULT_AUTHOR_IMAGE =
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=320&q=80"
const DEFAULT_ARTICLE_IMAGE =
  "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=1200&q=80"

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

const parseArticleCategory = (value: unknown): CmsArticleCategory | null => {
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

const parseCmsArticle = (value: unknown): CmsArticle | null => {
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

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const resolveTopicFromCategory = (
  category: CmsCategory | null | undefined,
): Exclude<BlogTopicKey, "all"> => {
  const slug = category?.slug

  if (slug === null || slug === undefined) {
    return DEFAULT_CMS_TOPIC
  }

  switch (slug) {
    case "beauty":
    case "krasa": {
      return "krasa"
    }
    case "fitness":
    case "sport": {
      return "fitness"
    }
    default: {
      return DEFAULT_CMS_TOPIC
    }
  }
}

const resolveAuthorName = (article: CmsArticle) => {
  const authorParts = [
    article.author?.firstName?.trim(),
    article.author?.lastName?.trim(),
  ].filter(Boolean)

  return authorParts.length > 0 ? authorParts.join(" ") : "Herbatika redakcia"
}

const mapCmsArticleToBlogPost = (article: CmsArticle): BlogPost | null => {
  const slug = article.slug?.trim()
  const title = article.title?.trim()

  if (
    slug === undefined ||
    slug.length === 0 ||
    title === undefined ||
    title.length === 0
  ) {
    return null
  }

  const categoryLabel = article.category?.title?.trim()
  const tags = (article.tags ?? []).filter(isNonEmptyString)
  if (categoryLabel !== undefined && categoryLabel.length > 0) {
    tags.push(categoryLabel)
  }
  const contentHtml = rewriteCmsHtmlMediaUrls(article.content ?? "")
  const excerpt =
    article.excerpt?.trim() ?? stripCmsHtml(contentHtml).slice(0, 180)

  return {
    author: resolveAuthorName(article),
    authorBio:
      "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    authorImageSrc: DEFAULT_AUTHOR_IMAGE,
    authorRole: "Článok pre vás pripravila",
    bulletPoints: [],
    contentHtml,
    excerpt,
    id: `cms-${article.id}`,
    imageSrc:
      resolveCmsMediaUrl(article.featuredImage) ?? DEFAULT_ARTICLE_IMAGE,
    lead: excerpt,
    publishedAt: article.publishedDate ?? new Date(0).toISOString(),
    readingTime: `${Math.max(article.readingTime ?? 1, 1)} min`,
    sections: [],
    slug,
    tags: tags.length > 0 ? tags : ["Novinky"],
    title,
    topic: resolveTopicFromCategory(article.category),
  }
}

const fetchCmsArticleCategories = async () => {
  const response = await fetchCmsJson("article-categories")
  if (!isRecord(response)) {
    return []
  }
  const categoriesValue = getRecordValue(response, "articleCategories")
  const rawCategories = Array.isArray(categoriesValue) ? categoriesValue : []

  return rawCategories
    .map(parseArticleCategory)
    .filter((category): category is CmsArticleCategory => category !== null)
}

const fetchCmsArticleBySlug = async (slug: string) => {
  const response = await fetchCmsJson(`articles/${encodeURIComponent(slug)}`)

  return isRecord(response)
    ? parseCmsArticle(getRecordValue(response, "article"))
    : null
}

export const fetchCmsBlogPost = async (slug: string) => {
  const article = await fetchCmsArticleBySlug(slug)

  return article ? mapCmsArticleToBlogPost(article) : null
}

export const fetchCmsBlogPosts = async () => {
  const categories = await fetchCmsArticleCategories()
  const slugSet = new Set<string>()
  for (const category of categories) {
    for (const article of category.articles ?? []) {
      const slug = article.slug?.trim()
      if (isNonEmptyString(slug)) {
        slugSet.add(slug)
      }
    }
  }
  const slugs = [...slugSet]

  const articles = await Promise.all(slugs.map(fetchCmsArticleBySlug))

  return articles
    .map((article) => (article ? mapCmsArticleToBlogPost(article) : null))
    .filter((post): post is BlogPost => Boolean(post))
    .toSorted(
      (left, right) =>
        new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime(),
    )
}
