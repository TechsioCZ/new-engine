import type {
  BlogCategory,
  BlogListing,
  BlogPost,
} from "@/lib/storefront/blog-content"
import { BLOG_PAGE_SIZE } from "@/lib/storefront/blog-content"
import { cacheLife } from "next/cache"
import {
  fetchCmsJsonOrThrow,
  isCmsNotFoundError,
} from "./cms-client"
import {
  mapCmsArticleIndexToCards,
  mapCmsArticleToBlogPost,
} from "./cms-blog-mappers"
import {
  buildCmsArticleIndex,
  buildCmsBlogPage,
  buildCmsCategoryFilters,
  resolveCmsBlogCategory,
} from "./cms-blog-index"
import type { CmsArticle, CmsArticleCategory } from "./cms-types"

export { mapCmsArticleToBlogPost } from "./cms-blog-mappers"

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
}

export const fetchCmsArticleCategories = async (signal?: AbortSignal) => {
  const response = await fetchCmsJsonOrThrow<CmsArticleCategoriesResponse>(
    "article-categories",
    { signal }
  )

  return response?.articleCategories ?? []
}

export const fetchCmsArticleBySlug = async (
  slug: string,
  signal?: AbortSignal
) => {
  try {
    const response = await fetchCmsJsonOrThrow<CmsArticleResponse>(
      `articles/${encodeURIComponent(slug)}`,
      { signal }
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
  signal?: AbortSignal
) => {
  const article = await fetchCmsArticleBySlug(slug, signal)

  return article ? mapCmsArticleToBlogPost(article, fallbackCategory) : null
}

export const fetchCmsBlogCategoryFilters = async () => {
  const categories = await fetchCmsArticleCategories()
  const articleIndex = buildCmsArticleIndex(categories)

  return buildCmsCategoryFilters(categories, articleIndex.length)
}

export const fetchCmsBlogListing = async ({
  category,
  page,
  pageSize = BLOG_PAGE_SIZE,
  signal,
}: FetchCmsBlogListingInput = {}): Promise<BlogListing> => {
  const categories = await fetchCmsArticleCategories(signal)
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
  excludeSlugs: string[] = []
) => {
  const categories = await fetchCmsArticleCategories()
  const excludedSlugs = new Set(excludeSlugs)
  const candidates = buildCmsArticleIndex(categories).filter(
    ({ summary }) => !excludedSlugs.has(summary.slug?.trim() ?? "")
  )
  const selectedEntries = candidates.slice(0, Math.max(limit, 0))

  return mapCmsArticleIndexToCards(selectedEntries)
}

export const fetchCachedLatestCmsBlogPosts = async (
  limit: number,
  excludeSlugs: string[] = []
) => {
  "use cache"
  cacheLife({
    expire: 3600,
    revalidate: 600,
    stale: 300,
  })

  return fetchLatestCmsBlogPosts(limit, excludeSlugs)
}
