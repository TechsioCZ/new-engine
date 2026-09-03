import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  readExactCatalogTranslations: vi.fn(),
  readPublishedBrandScope: vi.fn(),
}))

vi.mock("../../../../../../src/utils/catalog-translation", () => ({
  readExactCatalogTranslations: mocks.readExactCatalogTranslations,
}))
vi.mock("../../../../../../src/links/product-brand", () => ({
  ProductBrandLink: { entryPoint: "product_brand" },
}))
vi.mock(
  "../../../../../../src/utils/published-brand-scope",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../../../../../src/utils/published-brand-scope")
    >()),
    readPublishedBrandScope: mocks.readPublishedBrandScope,
  })
)

import { GET as getBrandProducts } from "../../../../../../src/api/store/brands/[id]/products/route"
import { GET as getBrand } from "../../../../../../src/api/store/brands/[id]/route"
import { GET as getBrands } from "../../../../../../src/api/store/brands/route"

const createMockResponse = () => {
  const response = {
    json: vi.fn(),
    status: vi.fn(),
  }
  response.json.mockReturnValue(response)
  response.status.mockReturnValue(response)
  return response
}

const request = (input: {
  fields?: string[]
  filterableFields?: Record<string, unknown>
  graph: ReturnType<typeof vi.fn>
  id?: string
  locale?: string
  remoteQuery?: ReturnType<typeof vi.fn>
}) => {
  const locale = input.locale ?? "ro-RO"
  const params = input.id ? { id: input.id } : {}
  const value = {
    filterableFields: input.filterableFields ?? {},
    locale,
    params,
    publishable_key_context: { sales_channel_ids: ["sc_ro"] },
    queryConfig: {
      fields: input.fields ?? ["id", "title", "handle"],
      pagination: { skip: 0, take: 500 },
    },
    scope: {
      resolve: vi.fn((key: string) =>
        key === ContainerRegistrationKeys.QUERY
          ? { graph: input.graph }
          : input.remoteQuery
      ),
    },
  }
  return value as never
}

describe("Store Brand market publication", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.readPublishedBrandScope.mockResolvedValue({
      brandIds: ["brand_ro"],
      kind: "published",
      market: "ro",
      salesChannelId: "sc_ro",
    })
    mocks.readExactCatalogTranslations.mockResolvedValue({
      kind: "found",
      localeCode: "ro-RO",
      missingEntityIds: [],
      proofsByEntityId: new Map([
        [
          "brand_ro",
          {
            localeCode: "ro-RO",
            reference: "brand",
            translationId: "trans_brand_ro",
          },
        ],
      ]),
    })
  })

  it("scopes the Romanian list before exact Translation and localized graph reads", async () => {
    const graph = vi.fn().mockResolvedValue({
      data: [{ handle: "marca", id: "brand_ro", title: "Marcă românească" }],
    })
    const response = createMockResponse()

    await getBrands(request({ graph }), response as never)

    expect(mocks.readPublishedBrandScope).toHaveBeenCalledWith({
      container: expect.anything(),
      locale: "ro-RO",
      salesChannelIds: ["sc_ro"],
    })
    expect(mocks.readExactCatalogTranslations).toHaveBeenCalledWith({
      container: expect.anything(),
      entityIds: ["brand_ro"],
      entityKind: "brand",
      market: "ro",
    })
    expect(graph).toHaveBeenCalledWith(
      {
        entity: "brand",
        fields: ["id", "title", "handle"],
        filters: { id: ["brand_ro"] },
        pagination: { skip: 0, take: 500 },
      },
      { locale: "ro-RO" }
    )
    expect(
      mocks.readPublishedBrandScope.mock.invocationCallOrder[0]
    ).toBeLessThan(
      mocks.readExactCatalogTranslations.mock.invocationCallOrder[0]
    )
    expect(
      mocks.readExactCatalogTranslations.mock.invocationCallOrder[0]
    ).toBeLessThan(graph.mock.invocationCallOrder[0])
    expect(response.json).toHaveBeenCalledWith({
      brands: [{ handle: "marca", id: "brand_ro", title: "Marcă românească" }],
    })
  })

  it("returns no Romanian brands without querying Translation or Brand when none are published", async () => {
    mocks.readPublishedBrandScope.mockResolvedValue({
      brandIds: [],
      kind: "published",
      market: "ro",
      salesChannelId: "sc_ro",
    })
    const graph = vi.fn()
    const response = createMockResponse()

    await getBrands(request({ graph }), response as never)

    expect(mocks.readExactCatalogTranslations).not.toHaveBeenCalled()
    expect(graph).not.toHaveBeenCalled()
    expect(response.json).toHaveBeenCalledWith({ brands: [] })
  })

  it("fails closed when a published Romanian Brand lacks an exact valid title", async () => {
    mocks.readExactCatalogTranslations.mockResolvedValue({
      kind: "found",
      localeCode: "ro-RO",
      missingEntityIds: ["brand_ro"],
      proofsByEntityId: new Map(),
    })
    const graph = vi.fn()
    const response = createMockResponse()

    await getBrands(request({ graph }), response as never)

    expect(graph).not.toHaveBeenCalled()
    expect(response.status).toHaveBeenCalledWith(503)
    expect(response.json).toHaveBeenCalledWith({
      code: "MISSING_BRAND_TRANSLATION",
      message: "Brand localization is unavailable.",
    })
  })

  it("preserves a valid id-only Romanian Brand list projection", async () => {
    const graph = vi.fn().mockResolvedValue({ data: [{ id: "brand_ro" }] })
    const response = createMockResponse()

    await getBrands(request({ fields: ["id"], graph }), response as never)

    expect(response.status).not.toHaveBeenCalled()
    expect(response.json).toHaveBeenCalledWith({ brands: [{ id: "brand_ro" }] })
  })

  it("returns 404 for a Romanian Brand excluded from the exact market publication scope", async () => {
    const graph = vi.fn()
    const response = createMockResponse()

    await expect(
      getBrand(request({ graph, id: "brand_excluded" }), response as never)
    ).rejects.toThrow('Brand with id "brand_excluded" was not found')

    expect(mocks.readExactCatalogTranslations).not.toHaveBeenCalled()
    expect(graph).not.toHaveBeenCalled()
  })

  it("loads an included Romanian Brand detail only through its exact localized title", async () => {
    const localizedBrand = {
      handle: "marca",
      id: "brand_ro",
      title: "Marcă românească",
    }
    const graph = vi.fn().mockResolvedValue({ data: [localizedBrand] })
    const response = createMockResponse()

    await getBrand(request({ graph, id: "brand_ro" }), response as never)

    expect(mocks.readExactCatalogTranslations).toHaveBeenCalledWith({
      container: expect.anything(),
      entityIds: ["brand_ro"],
      entityKind: "brand",
      market: "ro",
    })
    expect(graph).toHaveBeenCalledWith(
      {
        entity: "brand",
        fields: ["id", "title", "handle"],
        filters: { id: "brand_ro" },
        pagination: { skip: 0, take: 500 },
      },
      { locale: "ro-RO" }
    )
    expect(response.json).toHaveBeenCalledWith(localizedBrand)
  })

  it("preserves a valid handle-only Romanian Brand detail projection", async () => {
    const graph = vi.fn().mockResolvedValue({ data: [{ handle: "marca" }] })
    const response = createMockResponse()

    await getBrand(
      request({ fields: ["handle"], graph, id: "brand_ro" }),
      response as never
    )

    expect(response.status).not.toHaveBeenCalled()
    expect(response.json).toHaveBeenCalledWith({ handle: "marca" })
  })

  it("fails closed when the localized Brand graph response has a blank title", async () => {
    const graph = vi.fn().mockResolvedValue({
      data: [{ handle: "marca", id: "brand_ro", title: "   " }],
    })
    const response = createMockResponse()

    await getBrand(request({ graph, id: "brand_ro" }), response as never)

    expect(response.status).toHaveBeenCalledWith(503)
    expect(response.json).toHaveBeenCalledWith({
      code: "INVALID_BRAND_LOCALIZATION_RESPONSE",
      message: "Brand localization is unavailable.",
    })
  })

  it("preserves the unscoped Slovak source list", async () => {
    mocks.readPublishedBrandScope.mockResolvedValue({ kind: "source" })
    const brands = Array.from({ length: 128 }, (_, index) => ({
      handle: `brand-${index + 1}`,
      id: `brand_${index + 1}`,
      title: `Brand ${index + 1}`,
    }))
    const graph = vi.fn().mockResolvedValue({ data: brands })
    const response = createMockResponse()

    await getBrands(request({ graph, locale: "sk-SK" }), response as never)

    expect(mocks.readExactCatalogTranslations).not.toHaveBeenCalled()
    expect(graph).toHaveBeenCalledWith({
      entity: "brand",
      fields: ["id", "title", "handle"],
      pagination: { skip: 0, take: 500 },
    })
    expect(response.json).toHaveBeenCalledWith({ brands })
  })

  it("returns 404 before any graph read for excluded Romanian Brand products", async () => {
    const graph = vi.fn()
    const response = createMockResponse()

    await expect(
      getBrandProducts(
        request({ graph, id: "brand_excluded" }),
        response as never
      )
    ).rejects.toThrow('Brand with id "brand_excluded" was not found')

    expect(mocks.readExactCatalogTranslations).not.toHaveBeenCalled()
    expect(graph).not.toHaveBeenCalled()
  })

  it("returns localized products only for an included Romanian Brand", async () => {
    const graph = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: "brand_ro" }] })
      .mockResolvedValueOnce({ data: [{ product_id: "prod_visible" }] })
      .mockResolvedValueOnce({ data: [{ product_id: "prod_visible" }] })
      .mockResolvedValueOnce({
        data: [{ id: "prod_visible", title: "Produs românesc" }],
        metadata: { count: 1, skip: 0, take: 500 },
      })
    const response = createMockResponse()

    await getBrandProducts(
      request({
        filterableFields: {
          sales_channel_id: ["sc_ro"],
          status: "published",
        },
        graph,
        id: "brand_ro",
        remoteQuery: vi.fn(),
      }),
      response as never
    )

    expect(graph).toHaveBeenNthCalledWith(
      1,
      {
        entity: "brand",
        fields: ["id"],
        filters: { id: "brand_ro" },
      },
      { locale: "ro-RO" }
    )
    expect(graph).toHaveBeenNthCalledWith(
      4,
      {
        entity: "product",
        fields: ["id", "title", "handle"],
        filters: { id: ["prod_visible"], status: "published" },
        pagination: { skip: 0, take: 500 },
      },
      { locale: "ro-RO" }
    )
    expect(response.json).toHaveBeenCalledWith({
      count: 1,
      limit: 500,
      offset: 0,
      products: [{ id: "prod_visible", title: "Produs românesc" }],
    })
  })
})
