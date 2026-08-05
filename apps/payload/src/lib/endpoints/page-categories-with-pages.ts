import type { Endpoint } from "payload"

import { getCategoryDoc } from "../utils/doc-selectors"
import type { CategoryDoc } from "../utils/doc-selectors"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
} from "../utils/endpoint"

const DEFAULT_MAX_PAGES = 500

/** Minimal page record used to group by category. */
interface PageDoc {
  title: string | null
  slug?: string | null
  category?: number | CategoryDoc | null
}

/** Endpoint returning page categories grouped with their pages. */
export const pageCategoriesWithPagesEndpoint: Endpoint = {
  handler: async (req) => {
    const locale = getLocaleFromRequest(req)
    const categorySlug = getQueryParam(req, "categorySlug")

    const pagesResult = await req.payload.find({
      collection: "pages",
      depth: 1,
      pagination: false,
      limit: DEFAULT_MAX_PAGES,
      ...(locale ? { locale } : {}),
      where: {
        status: { equals: "published" },
        ...(categorySlug
          ? {
              "category.slug": { equals: categorySlug },
            }
          : {}),
      },
      select: {
        title: true,
        slug: true,
        category: true,
      },
      req,
    })

    const categoriesById = new Map<
      number,
      {
        id: number
        title: string | null
        slug: string | null
        pages: { title: string | null; slug?: string | null }[]
      }
    >()
    for (const page of pagesResult.docs as PageDoc[]) {
      const category = getCategoryDoc(page.category)
      if (!category) {
        continue
      }
      const entry = categoriesById.get(category.id) ?? {
        ...category,
        pages: [],
      }
      entry.pages.push({
        title: page.title,
        ...(page.slug !== undefined ? { slug: page.slug } : {}),
      })
      categoriesById.set(category.id, entry)
    }

    return buildJsonResponse(req, {
      categories: Array.from(categoriesById.values()),
    })
  },
  method: "get",
  path: "/page-categories-with-pages",
}
