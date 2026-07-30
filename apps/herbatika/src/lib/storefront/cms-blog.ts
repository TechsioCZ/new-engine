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
  resolveCmsMediaUrl,
  rewriteCmsHtmlMediaUrls,
  stripCmsHtml,
} from "./cms-client"
import {
  buildCmsArticleIndex,
  buildCmsBlogPage,
  buildCmsCategoryFilters,
  mapBlogPostToCard,
  resolveCmsBlogCategory,
  shuffleCmsArticleIndex,
} from "./cms-blog-index"
import type { CmsArticle, CmsArticleCategory } from "./cms-types"

const HERBATIKA_BLOG_CATEGORY_SLUG = "blog"
const UNSUPPORTED_LEXICAL_NODE_PATTERN =
  /<span(?:\s[^>]*)?>\s*unknown node\s*<\/span>/gi

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

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const resolveAuthorName = (article: CmsArticle) => {
  const authorParts = [
    article.author?.firstName?.trim(),
    article.author?.lastName?.trim(),
  ].filter(Boolean)

  return authorParts.length > 0 ? authorParts.join(" ") : "Herbatika redakcia"
}

const normalizeCmsArticleHtml = (html: string) =>
  rewriteCmsHtmlMediaUrls(html)
    .replace(UNSUPPORTED_LEXICAL_NODE_PATTERN, "")
    .trim()

export const mapCmsArticleToBlogPost = (
  article: CmsArticle,
  fallbackCategory?: BlogCategory
): BlogPost | null => {
  const slug = article.slug?.trim()
  const title = article.title?.trim()
  const imageSrc = resolveCmsMediaUrl(article.featuredImage)

  if (!(slug && title && imageSrc)) {
    return null
  }

  const category = resolveCmsBlogCategory(article.category, fallbackCategory)
  const contentHtml = normalizeCmsArticleHtml(article.content ?? "")
  const excerpt =
    article.excerpt?.trim() || stripCmsHtml(contentHtml).slice(0, 180)
  const tags = (article.tags ?? []).filter(isNonEmptyString)

  return {
    id: `cms-${article.id}`,
    slug,
    title,
    excerpt,
    imageSrc,
    category,
    tags: tags.length > 0 ? tags : [category.title],
    publishedAt: article.publishedDate ?? "",
    author: resolveAuthorName(article),
    authorRole: "Článok pre vás pripravila",
    authorBio:
      "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    readingTime: `${Math.max(article.readingTime ?? 1, 1)} min`,
    lead: excerpt,
    contentHtml,
  }
}

export const fetchCmsArticleCategories = async (signal?: AbortSignal) => {
  const response = await fetchCmsJsonOrThrow<CmsArticleCategoriesResponse>(
    "article-categories",
    {
      params: {
        categorySlug: HERBATIKA_BLOG_CATEGORY_SLUG,
      },
      signal,
    }
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

const fetchIndexedBlogCards = async (
  entries: ReturnType<typeof buildCmsArticleIndex>,
  signal?: AbortSignal
) => {
  const posts = await Promise.all(
    entries.map(({ category, summary }) =>
      fetchCmsBlogPost(summary.slug?.trim() ?? "", category, signal)
    )
  )

  return posts
    .filter((post): post is BlogPost => Boolean(post))
    .map(mapBlogPostToCard)
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
    posts: await fetchIndexedBlogCards(entries, signal),
  }
}

export const fetchRandomCmsBlogPosts = async (
  limit: number,
  excludeSlugs: string[] = []
) => {
  const categories = await fetchCmsArticleCategories()
  const excludedSlugs = new Set(excludeSlugs)
  const candidates = buildCmsArticleIndex(categories).filter(
    ({ summary }) => !excludedSlugs.has(summary.slug?.trim() ?? "")
  )
  const selectedEntries = shuffleCmsArticleIndex(candidates).slice(
    0,
    Math.max(limit, 0)
  )

  return fetchIndexedBlogCards(selectedEntries)
}

export const fetchCachedRandomCmsBlogPosts = async (
  limit: number,
  excludeSlugs: string[] = []
) => {
  "use cache"
  cacheLife({
    expire: 3600,
    revalidate: 600,
    stale: 300,
  })

  return fetchRandomCmsBlogPosts(limit, excludeSlugs)
}
