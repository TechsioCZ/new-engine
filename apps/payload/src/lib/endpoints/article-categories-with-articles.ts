import type { Endpoint } from "payload"

import type { Article } from "../../payload-types"
import type { CategoryDoc } from "../utils/doc-selectors"
import { getCategoryDoc, getMediaUrl } from "../utils/doc-selectors"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
} from "../utils/endpoint"

const MAX_ARTICLES = 500

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
      Pick<CategoryDoc, "id" | "slug" | "title"> & {
        articles: (Pick<Article, "slug" | "title"> & {
          excerpt: Article["excerpt"] | null | undefined
          featuredImage: string | null
        })[]
      }
    >()

    for (const article of articlesResult.docs) {
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

    return buildJsonResponse(req, {
      categories: [...categoriesById.values()],
    })
  },
  method: "get",
  path: "/article-categories-with-articles",
}
