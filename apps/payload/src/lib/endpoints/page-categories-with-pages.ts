import type { Endpoint } from "payload"
import { type CategoryDoc, getCategoryDoc } from "../utils/doc-selectors"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
  publishedInCategoryWhere,
} from "../utils/endpoint"

const DEFAULT_MAX_PAGES = 500

/** Minimal page record used to group by category. */
type PageDoc = {
  id: number
  title: string | null
  slug?: string | null
  category?: number | CategoryDoc | null
}

/** Endpoint returning page categories grouped with their pages. */
export const pageCategoriesWithPagesEndpoint: Endpoint = {
  path: "/page-categories-with-pages",
  method: "get",
  handler: async (req) => {
    const locale = getLocaleFromRequest(req)
    const categorySlug = getQueryParam(req, "categorySlug")

    const pagesResult = await req.payload.find({
      collection: "pages",
      depth: 1,
      pagination: false,
      limit: DEFAULT_MAX_PAGES,
      locale,
      where: publishedInCategoryWhere(categorySlug),
      select: {
        id: true,
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
        pages: { id: number; title: string | null; slug?: string | null }[]
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
      entry.pages.push({ id: page.id, title: page.title, slug: page.slug })
      categoriesById.set(category.id, entry)
    }

    return buildJsonResponse(req, {
      categories: Array.from(categoriesById.values()),
    })
  },
}
