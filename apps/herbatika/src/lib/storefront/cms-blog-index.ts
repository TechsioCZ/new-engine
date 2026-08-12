import type {
  BlogCategory,
  BlogCategoryFilter,
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

const resolvePublishedTime = (value: string | null | undefined) => {
  const timestamp = value ? new Date(value).getTime() : Number.NaN
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

const compareCmsArticlesByPublishedDate = (
  left: CmsArticleIndexEntry,
  right: CmsArticleIndexEntry
) => {
  const dateDifference =
    resolvePublishedTime(right.summary.publishedDate) -
    resolvePublishedTime(left.summary.publishedDate)

  return (
    dateDifference ||
    (left.summary.slug ?? "").localeCompare(right.summary.slug ?? "")
  )
}

type BuildCmsBlogPageInput = {
  categories: CmsArticleCategory[]
  category?: string
  page?: number
  pageSize: number
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

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

  return Array.from(articleBySlug.values()).sort(
    compareCmsArticlesByPublishedDate
  )
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
      : buildCmsArticleIndex(
          categories.filter(
            (cmsCategory) => cmsCategory.slug?.trim() === activeCategory
          )
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
