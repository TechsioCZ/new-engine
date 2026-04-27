import type { Endpoint } from 'payload'
import { buildJsonResponse, getLocaleFromRequest, getQueryParam } from '../utils/endpoint'
import { getCategoryDoc, type CategoryDoc } from '../utils/doc-selectors'

const DEFAULT_MAX_PAGES = 500;

/** Minimal page record used to group by category. */
type PageDoc = {
  title: string | null
  slug?: string | null
  category?: number | CategoryDoc | null
}

/** Endpoint returning page categories grouped with their pages. */
export const pageCategoriesWithPagesEndpoint: Endpoint = {
  path: '/page-categories-with-pages',
  method: 'get',
  handler: async (req) => {
    const locale = getLocaleFromRequest(req)
    const categorySlug = getQueryParam(req, 'categorySlug')

    const pagesResult = await req.payload.find({
      collection: 'pages',
      depth: 1,
      pagination: false,
      limit: DEFAULT_MAX_PAGES,
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
        category: true,
      },
      req,
    })

    const categoriesById = new Map<
      number,
      { id: number; title: string | null; slug: string | null; pages: { title: string | null; slug?: string | null }[] }
    >()
    for (const page of pagesResult.docs as PageDoc[]) {
      const category = getCategoryDoc(page.category)
      if (!category) {
        continue
      }
      const entry =
        categoriesById.get(category.id) ?? {
          ...category,
          pages: [],
        }
      entry.pages.push({ title: page.title, slug: page.slug })
      categoriesById.set(category.id, entry)
    }

    return buildJsonResponse(req, { categories: Array.from(categoriesById.values()) })
  },
}
