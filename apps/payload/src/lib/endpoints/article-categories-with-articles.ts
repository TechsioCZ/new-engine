import type { Endpoint } from "payload"
import {
  type CategoryDoc,
  getCategoryDoc,
  getMediaUrl,
} from "../utils/doc-selectors"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
} from "../utils/endpoint"

const MAX_ARTICLES = 500

/** Minimal media record needed for article listing. */
type MediaDoc = {
  url?: string | null
}

/** Minimal article record used to group by category. */
type ArticleDoc = {
  id: number
  title: unknown
  slug?: unknown
  excerpt?: unknown
  publishedDate?: unknown
  readingTime?: unknown
  featuredImage?: number | MediaDoc | null
  category?: number | CategoryDoc | null
  categories?: (number | CategoryDoc)[] | null
  primaryCategory?: number | CategoryDoc | null
}

/** Endpoint returning article categories grouped with their articles. */
export const articleCategoriesWithArticlesEndpoint: Endpoint = {
  path: "/article-categories-with-articles",
  method: "get",
  handler: async (req) => {
    const locale = getLocaleFromRequest(req)
    const categorySlug = getQueryParam(req, "categorySlug")

    const articlesResult = await req.payload.find({
      collection: "articles",
      depth: 1,
      pagination: true,
      limit: MAX_ARTICLES,
      locale,
      fallbackLocale: false,
      where: {
        and: [
          { status: { equals: "published" } },
          { slug: { exists: true } },
          { title: { exists: true } },
          ...(categorySlug
            ? [{ "categories.slug": { equals: categorySlug } }]
            : []),
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedDate: true,
        readingTime: true,
        featuredImage: true,
        category: true,
        categories: true,
        primaryCategory: true,
      },
      req,
    })

    const categoriesById = new Map<
      number,
      {
        id: number
        title: unknown
        slug: unknown
        articles: {
          id: number
          title: unknown
          slug?: unknown
          excerpt?: unknown
          featuredImage?: string | null
          primaryCategory?: CategoryDoc | null
          publishedDate?: unknown
          readingTime?: unknown
        }[]
      }
    >()
    for (const article of articlesResult.docs as ArticleDoc[]) {
      const categories = (article.categories ?? [article.category])
        .map(getCategoryDoc)
        .filter((category): category is CategoryDoc => Boolean(category))

      for (const category of categories) {
        const entry = categoriesById.get(category.id) ?? {
          ...category,
          articles: [],
        }
        entry.articles.push({
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          featuredImage: getMediaUrl(article.featuredImage),
          primaryCategory: getCategoryDoc(article.primaryCategory),
          publishedDate: article.publishedDate,
          readingTime: article.readingTime,
        })
        categoriesById.set(category.id, entry)
      }
    }

    return buildJsonResponse(req, {
      categories: Array.from(categoriesById.values()),
    })
  },
}
