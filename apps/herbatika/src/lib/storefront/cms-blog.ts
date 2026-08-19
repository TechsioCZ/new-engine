// Pages Router rejects the App-Router-only `server-only` marker. CMS callers
// must remain in server entry points and always provide an explicit locale.

import { unstable_cache } from "next/cache"
import type { BlogCategory, BlogListing } from "@/lib/storefront/blog-content"
import { BLOG_PAGE_SIZE } from "@/lib/storefront/blog-content"
import {
  buildCmsArticleIndex,
  buildCmsBlogPage,
  buildCmsCategoryFilters,
} from "./cms-blog-index"
import {
  type CmsBlogCardItem,
  mapCmsArticleIndexToCards,
  mapCmsArticleToBlogPost,
} from "./cms-blog-mappers"
import {
  CmsInvalidResponseError,
  CmsRequestError,
  type CmsSourceReadResult,
  fetchCmsJsonOrThrow,
  isCmsNotFoundError,
  readCmsJson,
} from "./cms-client"
import type { CmsArticle, CmsArticleCategory } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"

type CmsArticleCategoriesResponse = {
  articleCategories?: CmsArticleCategory[] | null
}

type CmsArticleResponse = {
  article?: CmsArticle | null
}

type FetchCmsBlogListingInput = {
  category?: string
  page?: number
  pageSize?: number
  signal?: AbortSignal
  locale?: HerbatikaLocale
}

export type CmsBlogListing = Omit<BlogListing, "posts"> & {
  posts: CmsBlogCardItem[]
}

export const fetchCmsArticleCategories = async (
  signal?: AbortSignal,
  locale?: HerbatikaLocale
) => {
  const response = await fetchCmsJsonOrThrow<CmsArticleCategoriesResponse>(
    "article-categories",
    { locale, signal }
  )

  return response?.articleCategories ?? []
}

export const fetchCmsArticleBySlug = async (
  slug: string,
  signal?: AbortSignal,
  locale?: HerbatikaLocale
) => {
  try {
    const response = await fetchCmsJsonOrThrow<CmsArticleResponse>(
      `articles/${encodeURIComponent(slug)}`,
      { locale, signal }
    )

    return response.article ?? null
  } catch (error) {
    if (isCmsNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export const fetchCmsBlogPost = async (
  slug: string,
  fallbackCategory?: BlogCategory,
  signal?: AbortSignal,
  locale?: HerbatikaLocale
) => {
  const article = await fetchCmsArticleBySlug(slug, signal, locale)

  return article ? mapCmsArticleToBlogPost(article, fallbackCategory) : null
}

export const fetchCmsBlogCategoryFilters = async (locale?: HerbatikaLocale) => {
  const categories = await fetchCmsArticleCategories(undefined, locale)
  const articleIndex = buildCmsArticleIndex(categories)

  return buildCmsCategoryFilters(categories, articleIndex.length)
}

export const fetchCmsBlogListing = async ({
  category,
  page,
  pageSize = BLOG_PAGE_SIZE,
  signal,
  locale,
}: FetchCmsBlogListingInput = {}): Promise<CmsBlogListing> => {
  const categories = await fetchCmsArticleCategories(signal, locale)
  const { entries, ...listing } = buildCmsBlogPage({
    categories,
    category,
    page,
    pageSize,
  })

  return {
    ...listing,
    posts: mapCmsArticleIndexToCards(entries),
  }
}

export const fetchLatestCmsBlogPosts = async (
  limit: number,
  excludeSlugs: string[] = [],
  locale?: HerbatikaLocale
) => {
  const categories = await fetchCmsArticleCategories(undefined, locale)
  const excludedSlugs = new Set(excludeSlugs)
  const candidates = buildCmsArticleIndex(categories).filter(
    ({ summary }) => !excludedSlugs.has(summary.slug?.trim() ?? "")
  )
  const selectedEntries = candidates.slice(0, Math.max(limit, 0))

  return mapCmsArticleIndexToCards(selectedEntries)
}

export const fetchCmsArticleById = async (
  id: string,
  locale: HerbatikaLocale,
  signal?: AbortSignal
) => {
  const result = await readCmsArticleById(id, locale, signal)
  if (result.kind === "found") {
    return result.value
  }
  if (result.kind === "missing") {
    return null
  }
  if (result.kind === "invalid-response") {
    throw new CmsInvalidResponseError(result.causeCode)
  }
  throw new CmsRequestError("CMS article source is unavailable", {
    retryAfterSeconds: result.retryAfterSeconds,
    status: 503,
  })
}

const isCmsArticle = (value: unknown): value is CmsArticle => {
  if (!(value && typeof value === "object")) {
    return false
  }

  const article = value as Partial<CmsArticle>
  const hasStableId =
    (typeof article.id === "number" && Number.isFinite(article.id)) ||
    (typeof article.id === "string" && article.id.trim().length > 0)
  return (
    hasStableId &&
    typeof article.title === "string" &&
    article.title.trim().length > 0
  )
}

export const readCmsArticleById = async (
  id: string,
  locale: HerbatikaLocale,
  signal?: AbortSignal
): Promise<CmsSourceReadResult<CmsArticle>> => {
  const result = await readCmsJson<CmsArticleResponse>(
    `articles/by-id/${encodeURIComponent(id)}`,
    { locale, signal }
  )

  if (result.kind !== "found") {
    return result
  }

  if (!isCmsArticle(result.value.article)) {
    return { kind: "invalid-response", causeCode: "INVALID_ARTICLE_ENVELOPE" }
  }
  if (String(result.value.article.id).trim() !== id.trim()) {
    return { kind: "invalid-response", causeCode: "MISMATCHED_ARTICLE_ID" }
  }
  return { kind: "found", value: result.value.article }
}

export const fetchCmsBlogPostById = async (
  id: string,
  locale: HerbatikaLocale,
  signal?: AbortSignal
) => {
  const article = await fetchCmsArticleById(id, locale, signal)
  return article ? mapCmsArticleToBlogPost(article) : null
}

export const fetchCachedLatestCmsBlogPosts = unstable_cache(
  fetchLatestCmsBlogPosts,
  ["cms-blog-latest"],
  {
    revalidate: 600,
    tags: ["cms-blog"],
  }
)
