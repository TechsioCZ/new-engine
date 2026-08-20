import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { GET as getCategory } from "../../../../../../src/api/store/product-categories/[id]/route"
import { GET as listCategories } from "../../../../../../src/api/store/product-categories/route"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../../../../src/modules/storefront-url-assignment"

const publishedIds = Array.from(
  { length: 207 },
  (_, index) => `pcat_published_${index + 1}`
)
const draftIds = ["pcat_draft_1", "pcat_draft_2"]
const allIds = [...publishedIds, ...draftIds]

const category = (id: string) => ({
  description: `Slovenský popis ${id}`,
  id,
  metadata: { top_description_html: `<p>Slovenský text ${id}</p>` },
  name: `Slovenská kategória ${id}`,
})

const translation = (id: string) => ({
  deleted_at: null,
  id: `translation_${id}`,
  locale_code: "ro-RO",
  reference: "product_category",
  reference_id: id,
  translations: {
    bottom_description_html: `<p>Jos ${id}</p>`,
    description: `Descriere ${id}`,
    meta_description: `Meta descriere ${id}`,
    meta_title: `Titlu ${id}`,
    name: `Categorie ${id}`,
    top_description_html: `<p>Sus ${id}</p>`,
  },
})

const assignment = (id: string) => ({
  entity_id: id,
  entity_kind: "category",
  market_code: "ro",
  publication_status: "published",
  sales_channel_id: "sc_ro",
})

const response = () => {
  const res = {
    json: vi.fn(),
    status: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

const request = ({
  locale,
  query,
  translations,
}: {
  locale: "ro-RO" | "sk-SK"
  query: { graph: ReturnType<typeof vi.fn> }
  translations: { listTranslations: ReturnType<typeof vi.fn> }
}) => {
  const assignments = {
    listStorefrontUrlAssignments: vi
      .fn()
      .mockResolvedValue(publishedIds.map(assignment)),
  }
  const resolve = vi.fn((key: string) => {
    if (key === ContainerRegistrationKeys.QUERY) {
      return query
    }
    if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
      return assignments
    }
    if (key === Modules.TRANSLATION) {
      return translations
    }
    throw new Error(`Unexpected dependency: ${key}`)
  })

  return {
    assignments,
    req: {
      filterableFields: {},
      locale,
      params: {},
      publishable_key_context: { sales_channel_ids: ["sc_ro"] },
      queryConfig: {
        fields: ["id", "name", "description", "metadata"],
        pagination: { skip: 0, take: 500 },
      },
      scope: { resolve },
    },
    resolve,
  }
}

describe("store product category publication scope", () => {
  it("lists 207 published Romanian categories without requiring translations for 2 drafts", async () => {
    const graph = vi.fn(async ({ filters }: { filters: { id?: string[] } }) => {
      const ids = filters.id ?? allIds
      const data = ids.map(category)
      data[0] = {
        ...data[0],
        category_children: [
          category(publishedIds[1] as string),
          category(draftIds[0] as string),
        ],
      }
      return {
        data,
        metadata: { count: ids.length, skip: 0, take: 500 },
      }
    })
    const listTranslations = vi
      .fn()
      .mockResolvedValue(publishedIds.map(translation))
    const { assignments, req } = request({
      locale: "ro-RO",
      query: { graph },
      translations: { listTranslations },
    })
    const res = response()

    await listCategories(req as never, res as never)

    expect(res.status).not.toHaveBeenCalled()
    expect(assignments.listStorefrontUrlAssignments).toHaveBeenCalledWith(
      {
        entity_kind: "category",
        market_code: "ro",
        publication_status: "published",
        sales_channel_id: "sc_ro",
      },
      expect.objectContaining({ take: 10_001 })
    )
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { id: publishedIds },
      }),
      { locale: "ro-RO" }
    )
    expect(listTranslations).toHaveBeenCalledWith(
      expect.objectContaining({ reference_id: publishedIds }),
      expect.objectContaining({ take: 208 })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 207,
        product_categories: expect.arrayContaining([
          expect.objectContaining({
            id: publishedIds[0],
            name: `Categorie ${publishedIds[0]}`,
          }),
        ]),
      })
    )
    const body = res.json.mock.calls[0]?.[0] as {
      product_categories: Array<{
        category_children?: Array<{ id: string; name: string }>
        id: string
      }>
    }
    expect(body.product_categories).toHaveLength(207)
    expect(body.product_categories.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(draftIds)
    )
    expect(body.product_categories[0]?.category_children).toEqual([
      expect.objectContaining({
        id: publishedIds[1],
        name: `Categorie ${publishedIds[1]}`,
      }),
    ])
  })

  it("keeps the Slovak source list independent of assignments and translations", async () => {
    const graph = vi.fn().mockResolvedValue({
      data: allIds.map(category),
      metadata: { count: allIds.length, skip: 0, take: 500 },
    })
    const listTranslations = vi.fn()
    const { assignments, req, resolve } = request({
      locale: "sk-SK",
      query: { graph },
      translations: { listTranslations },
    })
    const res = response()

    await listCategories(req as never, res as never)

    expect(assignments.listStorefrontUrlAssignments).not.toHaveBeenCalled()
    expect(listTranslations).not.toHaveBeenCalled()
    expect(resolve).not.toHaveBeenCalledWith(STOREFRONT_URL_ASSIGNMENT_MODULE)
    expect(resolve).not.toHaveBeenCalledWith(Modules.TRANSLATION)
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({ filters: {} }),
      { locale: "sk-SK" }
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ count: 209 })
    )
  })

  it("keeps an unpublished Romanian category detail unavailable before querying content", async () => {
    const graph = vi.fn()
    const listTranslations = vi.fn()
    const { req } = request({
      locale: "ro-RO",
      query: { graph },
      translations: { listTranslations },
    })
    req.params = { id: draftIds[0] }
    const res = response()

    await expect(getCategory(req as never, res as never)).rejects.toMatchObject(
      { type: "not_found" }
    )
    expect(graph).not.toHaveBeenCalled()
    expect(listTranslations).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })
})
