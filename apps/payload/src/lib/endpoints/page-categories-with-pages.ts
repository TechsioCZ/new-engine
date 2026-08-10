import type { Endpoint } from "payload"

import type { Page } from "../../payload-types"
import type { CategoryDoc } from "../utils/doc-selectors"
import { getCategoryDoc } from "../utils/doc-selectors"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
} from "../utils/endpoint"

const DEFAULT_MAX_PAGES = 500

/** Endpoint returning page categories grouped with their pages. */
export const pageCategoriesWithPagesEndpoint: Endpoint = {
  handler: async (req) => {
    const locale = getLocaleFromRequest(req)
    const categorySlug = getQueryParam(req, "categorySlug")

    const pagesResult = await req.payload.find({
      collection: "pages",
      depth: 1,
      limit: DEFAULT_MAX_PAGES,
      ...(locale === undefined ? {} : { locale }),
      pagination: false,
      req,
      select: {
        category: true,
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
        pages: Pick<Page, "slug" | "title">[]
      }
    >()

    for (const page of pagesResult.docs) {
      const category = getCategoryDoc(page.category)
      if (category !== null) {
        const entry = categoriesById.get(category.id) ?? {
          ...category,
          pages: [],
        }
        entry.pages.push({ slug: page.slug, title: page.title })
        categoriesById.set(category.id, entry)
      }
    }

    return buildJsonResponse(req, {
      categories: [...categoriesById.values()],
    })
  },
  method: "get",
  path: "/page-categories-with-pages",
}
