import { isRecord } from "@techsio/std/object"
import type { Endpoint } from "payload"

import { getCategoryDoc } from "../utils/doc-selectors"
import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
} from "../utils/endpoint"

const DEFAULT_MAX_PAGES = 500

/** Minimal page record used to group by category. */
interface PageDoc {
  category?: unknown
  slug: string | null | undefined
  title: string | null
}

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string"

const isOptionalNullableString = (
  value: unknown,
): value is string | null | undefined =>
  value === undefined || isNullableString(value)

const parsePageDoc = (value: unknown): PageDoc | null => {
  if (!isRecord(value)) {
    return null
  }

  const { category, slug, title } = value
  if (!isNullableString(title) || !isOptionalNullableString(slug)) {
    return null
  }

  return { category, slug, title }
}

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
      {
        id: number
        title: string | null
        slug: string | null
        pages: { title: string | null; slug?: string | null }[]
      }
    >()
    const pageDocs: unknown = pagesResult.docs
    if (!Array.isArray(pageDocs)) {
      throw new TypeError(
        "Payload pages response did not contain a document list",
      )
    }

    for (const value of pageDocs) {
      const page = parsePageDoc(value)
      if (page !== null) {
        const category = getCategoryDoc(page.category)
        if (category !== null) {
          const entry = categoriesById.get(category.id) ?? {
            ...category,
            pages: [],
          }
          entry.pages.push({
            title: page.title,
            ...(page.slug === undefined ? {} : { slug: page.slug }),
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
  path: "/page-categories-with-pages",
}
