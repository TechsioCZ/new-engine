import type {
  BlogCardItem,
  BlogCategory,
  BlogCategoryFilter,
  BlogPost,
} from "@/lib/storefront/blog-content"
import type {
  CmsArticleCategory,
  CmsArticleSummary,
  CmsCategory,
} from "./cms-types"
import { ALL_BLOG_CATEGORIES_KEY } from "./blog-routing"

const FALLBACK_CATEGORY: BlogCategory = {
  slug: "blog",
  title: "Blog",
}

export type CmsArticleIndexEntry = {
  category: BlogCategory
  summary: CmsArticleSummary
}

type BuildCmsBlogPageInput = {
  categories: CmsArticleCategory[]
  category?: string
  page?: number
  pageSize: number
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export const mapBlogPostToCard = (post: BlogPost): BlogCardItem => ({
  category: post.category,
  excerpt: post.excerpt,
  id: post.id,
  imageSrc: post.imageSrc,
  publishedAt: post.publishedAt,
  readingTime: post.readingTime,
  slug: post.slug,
  title: post.title,
})

export const resolveCmsBlogCategory = (
  category: CmsCategory | null | undefined,
  fallback = FALLBACK_CATEGORY
): BlogCategory => {
  const slug = category?.slug?.trim()
  const title = category?.title?.trim()

  return {
    slug: slug || fallback.slug,
    title: title || fallback.title,
  }
}

export const buildCmsArticleIndex = (
  categories: CmsArticleCategory[]
): CmsArticleIndexEntry[] => {
  const articleBySlug = new Map<string, CmsArticleIndexEntry>()

  for (const cmsCategory of categories) {
    const category = resolveCmsBlogCategory(cmsCategory)

    for (const summary of cmsCategory.articles ?? []) {
      const slug = summary.slug?.trim()
      if (!(slug && summary.title?.trim()) || articleBySlug.has(slug)) {
        continue
      }

      articleBySlug.set(slug, { category, summary })
    }
  }

  return Array.from(articleBySlug.values())
}

export const buildCmsCategoryFilters = (
  categories: CmsArticleCategory[],
  totalItems: number
): BlogCategoryFilter[] => [
  {
    key: ALL_BLOG_CATEGORIES_KEY,
    label: "Všetky",
    count: totalItems,
  },
  ...categories
    .map((category) => ({
      key: category.slug?.trim() ?? "",
      label: category.title?.trim() ?? "",
      count: new Set(
        (category.articles ?? [])
          .map((article) => article.slug?.trim())
          .filter(isNonEmptyString)
      ).size,
    }))
    .filter((category) => category.key && category.label && category.count > 0),
]

export const shuffleCmsArticleIndex = (items: CmsArticleIndexEntry[]) => {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const item = shuffled[index]
    shuffled[index] = shuffled[randomIndex] as CmsArticleIndexEntry
    shuffled[randomIndex] = item as CmsArticleIndexEntry
  }

  return shuffled
}

export const buildCmsBlogPage = ({
  categories,
  category,
  page,
  pageSize,
}: BuildCmsBlogPageInput) => {
  const articleIndex = buildCmsArticleIndex(categories)
  const categoryFilters = buildCmsCategoryFilters(
    categories,
    articleIndex.length
  )
  const requestedCategory = category?.trim() || ALL_BLOG_CATEGORIES_KEY
  const activeCategory = categoryFilters.some(
    (filter) => filter.key === requestedCategory
  )
    ? requestedCategory
    : ALL_BLOG_CATEGORIES_KEY
  const filteredEntries =
    activeCategory === ALL_BLOG_CATEGORIES_KEY
      ? articleIndex
      : articleIndex.filter(
          (entry) => entry.category.slug === activeCategory
        )
  const safePageSize = Math.max(Math.floor(pageSize), 1)
  const totalItems = filteredEntries.length
  const totalPages = Math.max(Math.ceil(totalItems / safePageSize), 1)
  const requestedPage =
    typeof page === "number" && Number.isFinite(page) && page > 0
      ? Math.floor(page)
      : 1
  const activePage = Math.min(requestedPage, totalPages)
  const pageStart = (activePage - 1) * safePageSize

  return {
    category: activeCategory,
    categoryFilters,
    entries: filteredEntries.slice(pageStart, pageStart + safePageSize),
    page: activePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    hasPreviousPage: activePage > 1,
    hasNextPage: activePage < totalPages,
  }
}
