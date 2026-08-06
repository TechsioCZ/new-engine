import { isRecord } from "@techsio/std/object"
import type { Endpoint } from "payload"

import { getCategoryDoc, getMediaUrl } from "../utils/doc-selectors"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
} from "../utils/endpoint"

const MAX_ARTICLES = 500

/** Minimal article record used to group by category. */
interface ArticleDoc {
  category?: unknown
  excerpt?: unknown
  featuredImage?: unknown
  slug?: unknown
  title: unknown
}

const parseArticleDoc = (value: unknown): ArticleDoc | null => {
  if (!isRecord(value) || !("title" in value)) {
    return null
  }

  const { category, excerpt, featuredImage, slug, title } = value
  return { category, excerpt, featuredImage, slug, title }
}

/** Endpoint returning article categories grouped with their articles. */
export const articleCategoriesWithArticlesEndpoint: Endpoint = {
  handler: async (req) => {
    const locale = getLocaleFromRequest(req)
    const categorySlug = getQueryParam(req, "categorySlug")

    const articlesResult = await req.payload.find({
      collection: "articles",
      depth: 1,
      limit: MAX_ARTICLES,
      ...(locale === undefined ? {} : { locale }),
      pagination: true,
      req,
      select: {
        category: true,
        excerpt: true,
        featuredImage: true,
        slug: true,
        title: true,
      },
      where: {
        status: { equals: "published" },
        ...(categorySlug === undefined
          ? {}
          : {
              "category.slug": { equals: categorySlug },
            }),
      },
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
    const articleDocs: unknown = articlesResult.docs
    if (!Array.isArray(articleDocs)) {
      throw new TypeError(
        "Payload articles response did not contain a document list",
      )
    }

    for (const value of articleDocs) {
      const article = parseArticleDoc(value)
      if (article !== null) {
        const category = getCategoryDoc(article.category)
        if (category !== null) {
          const entry = categoriesById.get(category.id) ?? {
            ...category,
            articles: [],
          }
          entry.articles.push({
            excerpt: article.excerpt,
            featuredImage: getMediaUrl(article.featuredImage),
            slug: article.slug,
            title: article.title,
          })
          categoriesById.set(category.id, entry)
        }
      }
    }

    return buildJsonResponse(req, {
      categories: [...categoriesById.values()],
    })
  },
  method: "get",
  path: "/article-categories-with-articles",
}
