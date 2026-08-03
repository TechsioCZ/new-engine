import {
  buildCmsArticleContentSegments,
  buildCmsArticleTableOfContents,
} from "./content-segments"
import type {
  CmsArticleDTO,
  CmsStoreArticleAuthorDTO,
  CmsStoreArticleCategoryDTO,
  CmsStoreArticleDTO,
  CmsStoreMediaDTO,
  CmsStoreRelatedArticleDTO,
} from "./types"

const MAX_RELATED_ARTICLES = 4

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isDocumentId = (value: unknown): value is number | string =>
  typeof value === "number" || typeof value === "string"

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" ? value : null

const mapMedia = (value: unknown): CmsStoreMediaDTO | null => {
  if (!(isRecord(value) && isDocumentId(value.id))) {
    return null
  }

  const url = stringOrNull(value.url)
  if (!url) {
    return null
  }

  return {
    id: value.id,
    alt: stringOrNull(value.alt),
    url,
    width: numberOrNull(value.width),
    height: numberOrNull(value.height),
  }
}

const mapCategory = (
  value: unknown
): CmsStoreArticleCategoryDTO | null => {
  if (!(isRecord(value) && isDocumentId(value.id))) {
    return null
  }

  const title = stringOrNull(value.title)
  const slug = stringOrNull(value.slug)
  if (!(title && slug)) {
    return null
  }

  return { id: value.id, title, slug }
}

const mapAuthor = (value: unknown): CmsStoreArticleAuthorDTO | null => {
  if (!(isRecord(value) && isDocumentId(value.id))) {
    return null
  }

  const displayName = stringOrNull(value.displayName)?.trim()
  if (!displayName) {
    return null
  }

  return {
    id: value.id,
    displayName,
    role: stringOrNull(value.role),
    bio: stringOrNull(value.bio),
    portrait: mapMedia(value.portrait),
  }
}

const mapRelatedArticle = (
  value: unknown
): CmsStoreRelatedArticleDTO | null => {
  if (
    !(
      isRecord(value) &&
      isDocumentId(value.id) &&
      value.status === "published"
    )
  ) {
    return null
  }

  const slug = stringOrNull(value.slug)?.trim()
  const title = stringOrNull(value.title)?.trim()
  if (!(slug && title)) {
    return null
  }

  return {
    id: value.id,
    slug,
    title,
    excerpt: stringOrNull(value.excerpt),
    featuredImage: mapMedia(value.featuredImage),
    primaryCategory: mapCategory(value.primaryCategory),
    publishedDate: stringOrNull(value.publishedDate),
    readingTime: numberOrNull(value.readingTime),
  }
}

export const toCmsStoreArticle = (
  article: CmsArticleDTO
): CmsStoreArticleDTO => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  excerpt: article.excerpt ?? null,
  featuredImage: mapMedia(article.featuredImage),
  category: mapCategory(article.category),
  categories: (article.categories ?? [])
    .map(mapCategory)
    .filter((category): category is CmsStoreArticleCategoryDTO => !!category),
  primaryCategory: mapCategory(article.primaryCategory),
  author: mapAuthor(article.articleAuthor),
  meta: article.meta
    ? {
        title: article.meta.title ?? null,
        description: article.meta.description ?? null,
        image: mapMedia(article.meta.image),
      }
    : null,
  publishedDate: article.publishedDate ?? null,
  readingTime: article.readingTime ?? null,
  tags: article.tags ?? [],
  contentSegments: buildCmsArticleContentSegments(
    article.content,
    article.contentHTML
  ),
  tableOfContents: buildCmsArticleTableOfContents(article.content),
  relatedArticles: (article.relatedArticles ?? [])
    .map(mapRelatedArticle)
    .filter((related): related is CmsStoreRelatedArticleDTO => !!related)
    .slice(0, MAX_RELATED_ARTICLES),
})
