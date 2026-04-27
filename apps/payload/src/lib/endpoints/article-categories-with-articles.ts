import type { Endpoint } from 'payload'
import { buildJsonResponse, getLocaleFromRequest, getQueryParam } from '../utils/endpoint'
import { getCategoryDoc, getMediaUrl, type CategoryDoc } from '../utils/doc-selectors'

const MAX_ARTICLES = 500

/** Minimal media record needed for article listing. */
type MediaDoc = {
  url?: string | null
}

/** Minimal article record used to group by category. */
type ArticleDoc = {
  title: unknown
  slug?: unknown
  excerpt?: unknown
  featuredImage?: number | MediaDoc | null
  category?: number | CategoryDoc | null
}

/** Endpoint returning article categories grouped with their articles. */
export const articleCategoriesWithArticlesEndpoint: Endpoint = {
  path: '/article-categories-with-articles',
  method: 'get',
  handler: async (req) => {
    const locale = getLocaleFromRequest(req)
    const categorySlug = getQueryParam(req, 'categorySlug')

    const articlesResult = await req.payload.find({
      collection: 'articles',
      depth: 1,
      pagination: true,
      limit: MAX_ARTICLES,
      locale,
      where: {
        status: { equals: 'published' },
        ...(categorySlug
          ? {
              'category.slug': { equals: categorySlug },
            }
          : {}),
      },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        category: true,
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
          title: unknown
          slug?: unknown
          excerpt?: unknown
          featuredImage?: string | null
        }[]
      }
    >()
    for (const article of articlesResult.docs as ArticleDoc[]) {
      const category = getCategoryDoc(article.category)
      if (!category) {
        continue
      }
      const entry =
        categoriesById.get(category.id) ?? {
          ...category,
          articles: [],
        }
      entry.articles.push({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        featuredImage: getMediaUrl(article.featuredImage),
      })
      categoriesById.set(category.id, entry)
    }

    return buildJsonResponse(req, { categories: Array.from(categoriesById.values()) })
  },
}
