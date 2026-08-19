import "server-only"

import { unstable_cache } from "next/cache"
import type { BlogCategory, BlogListing } from "@/lib/storefront/blog-content"
import { BLOG_PAGE_SIZE } from "@/lib/storefront/blog-content"
import {
  buildCmsArticleIndex,
  buildCmsBlogPage,
  buildCmsCategoryFilters,
} from "./cms-blog-index"
import {
  mapCmsArticleIndexToCards,
  mapCmsArticleToBlogPost,
} from "./cms-blog-mappers"
import { fetchCmsJsonOrThrow, isCmsNotFoundError } from "./cms-client"
import type { CmsLocale } from "./cms-locale"
import type { CmsArticle, CmsArticleCategory } from "./cms-types"

type CmsArticleCategoriesResponse = {
  articleCategories?: CmsArticleCategory[] | null
}

type CmsArticleResponse = {
  article?: CmsArticle | null
}

type FetchCmsBlogListingInput = {
  category?: string
  locale: CmsLocale
  page?: number
  pageSize?: number
  signal?: AbortSignal
}

export const fetchCmsArticleCategories = async (
  locale: CmsLocale,
  signal?: AbortSignal
) => {
  const response = await fetchCmsJsonOrThrow<CmsArticleCategoriesResponse>(
    "article-categories",
    { locale, signal }
  )

  return response?.articleCategories ?? []
}

export const fetchCmsArticleBySlug = async (
  slug: string,
  locale: CmsLocale,
  signal?: AbortSignal
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
  locale: CmsLocale,
  fallbackCategory?: BlogCategory,
  signal?: AbortSignal
) => {
  const article = await fetchCmsArticleBySlug(slug, locale, signal)

  return article ? mapCmsArticleToBlogPost(article, fallbackCategory) : null
}

export const fetchCmsBlogCategoryFilters = async (locale: CmsLocale) => {
  const categories = await fetchCmsArticleCategories(locale)
  const articleIndex = buildCmsArticleIndex(categories)

  return buildCmsCategoryFilters(categories, articleIndex.length)
}

export const fetchCmsBlogListing = async ({
  category,
  locale,
  page,
  pageSize = BLOG_PAGE_SIZE,
  signal,
}: FetchCmsBlogListingInput): Promise<BlogListing> => {
  const categories = await fetchCmsArticleCategories(locale, signal)
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
  locale: CmsLocale,
  limit: number,
  excludeSlugs: string[] = []
) => {
  const categories = await fetchCmsArticleCategories(locale)
  const excludedSlugs = new Set(excludeSlugs)
  const candidates = buildCmsArticleIndex(categories).filter(
    ({ summary }) => !excludedSlugs.has(summary.slug?.trim() ?? "")
  )
  const selectedEntries = candidates.slice(0, Math.max(limit, 0))

  return mapCmsArticleIndexToCards(selectedEntries)
}

export const fetchCachedLatestCmsBlogPosts = unstable_cache(
  fetchLatestCmsBlogPosts,
  ["cms-blog-latest"],
  {
    revalidate: 600,
    tags: ["cms-blog"],
  }
)
