import { GET } from "../../../src/api/store/catalog/products/route"

type TestProduct = {
  id: string
  title: string
  status: "published" | "draft"
  salesChannelIds: string[]
  statusFacets?: string[]
  formFacets?: string[]
  brandFacets?: string[]
  ingredientFacets?: string[]
  facetPrice?: number
}

type GraphConfig = {
  entity: string
  fields?: string[]
  filters?: Record<string, unknown>
}

const getFilterIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string")
  }

  if (typeof value === "string") {
    return [value]
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const inValue = (value as Record<string, unknown>).$in
    if (Array.isArray(inValue)) {
      return inValue.filter((item): item is string => typeof item === "string")
    }
  }

  return []
}

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string")
  }

  return typeof value === "string" ? [value] : []
}

const getMeiliIdFilterIds = (filter: unknown): string[] => {
  if (!Array.isArray(filter)) {
    return []
  }

  const ids: string[] = []
  for (const expression of filter) {
    if (typeof expression !== "string" || !expression.includes("id = ")) {
      continue
    }

    for (const match of expression.matchAll(/id = "([^"]+)"/g)) {
      const id = match[1]
      if (id) {
        ids.push(id)
      }
    }
  }

  return ids
}

const createMockResponse = () =>
  ({
    json: jest.fn().mockReturnThis(),
  }) as any

const createCatalogHarness = ({
  products,
  salesChannelId = "sc_visible",
  query = {},
}: {
  products: TestProduct[]
  salesChannelId?: string
  query?: Record<string, unknown>
}) => {
  const productById = new Map(products.map((product) => [product.id, product]))

  const meiliSearch = jest.fn(
    async (
      _index: string,
      _query: string,
      options: {
        paginationOptions: {
          limit: number
          offset: number
        }
        additionalOptions?: {
          attributesToRetrieve?: string[]
        }
        filter?: string[]
      }
    ) => {
      const attributesToRetrieve =
        options.additionalOptions?.attributesToRetrieve ?? []
      const isFacetDocumentSearch =
        attributesToRetrieve.includes("facet_status")

      if (isFacetDocumentSearch) {
        const idFilterIds = getMeiliIdFilterIds(options.filter)

        return {
          hits: idFilterIds.flatMap((id) => {
            const product = productById.get(id)
            if (!product) {
              return []
            }

            return [
              {
                id: product.id,
                facet_status: product.statusFacets ?? [],
                facet_form: product.formFacets ?? [],
                facet_brand: product.brandFacets ?? [],
                facet_ingredient: product.ingredientFacets ?? [],
                facet_price: product.facetPrice,
              },
            ]
          }),
          estimatedTotalHits: idFilterIds.length,
        }
      }

      const hits = products
        .slice(
          options.paginationOptions.offset,
          options.paginationOptions.offset + options.paginationOptions.limit
        )
        .map((product) => ({ id: product.id }))

      const visiblePrices = products
        .map((product) => product.facetPrice)
        .filter((price): price is number => typeof price === "number")

      return {
        hits,
        estimatedTotalHits: products.length,
        facetDistribution: {
          facet_status: {
            action: products.filter((product) =>
              product.statusFacets?.includes("action")
            ).length,
            "in-stock": products.filter((product) =>
              product.statusFacets?.includes("in-stock")
            ).length,
          },
          facet_form: {},
          facet_brand: {
            "brand-hidden": products.filter((product) =>
              product.brandFacets?.includes("brand-hidden")
            ).length,
          },
          facet_ingredient: {},
        },
        facetStats: {
          facet_price: {
            min: visiblePrices.length ? Math.min(...visiblePrices) : undefined,
            max: visiblePrices.length ? Math.max(...visiblePrices) : undefined,
          },
        },
      }
    }
  )

  const queryGraph = jest.fn(async (config: GraphConfig) => {
    const filters = config.filters ?? {}

    if (config.entity === "product_sales_channel") {
      const productIds = getFilterIds(filters.product_id)
      const salesChannelIds = toArray(filters.sales_channel_id)

      return {
        data: productIds.flatMap((productId) => {
          const product = productById.get(productId)
          if (!product) {
            return []
          }

          const isLinked = product.salesChannelIds.some((id) =>
            salesChannelIds.includes(id)
          )

          return isLinked ? [{ product_id: product.id }] : []
        }),
      }
    }

    if (config.entity === "product") {
      const productIds = getFilterIds(filters.id)
      const status = filters.status

      return {
        data: productIds
          .map((productId) => productById.get(productId))
          .filter((product): product is TestProduct => Boolean(product))
          .filter((product) => !status || product.status === status)
          .map((product) => ({
            id: product.id,
            title: product.title,
            handle: product.id,
            thumbnail: null,
            metadata: {},
            variants: [],
            categories: [],
            producer: null,
          })),
      }
    }

    return { data: [] }
  })

  const req = {
    validatedQuery: {
      q: "",
      page: 1,
      limit: 12,
      sort: "recommended",
      ...query,
    },
    filterableFields: {
      sales_channel_id: [salesChannelId],
      status: "published",
    },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === "meilisearch") {
          return { search: meiliSearch }
        }
        return { graph: queryGraph }
      }),
    },
  } as any

  const res = createMockResponse()

  return {
    req,
    res,
    meiliSearch,
    queryGraph,
  }
}

const getJsonPayload = (res: ReturnType<typeof createMockResponse>) =>
  res.json.mock.calls[0][0]

describe("GET /store/catalog/products", () => {
  it("excludes draft products from Meili hits", async () => {
    const { req, res } = createCatalogHarness({
      products: [
        {
          id: "prod_draft",
          title: "Draft product",
          status: "draft",
          salesChannelIds: ["sc_visible"],
        },
      ],
    })

    await GET(req, res)

    expect(getJsonPayload(res).products).toEqual([])
    expect(getJsonPayload(res).count).toBe(0)
  })

  it("excludes products outside the publishable-key sales channel", async () => {
    const { req, res } = createCatalogHarness({
      products: [
        {
          id: "prod_hidden_channel",
          title: "Hidden channel product",
          status: "published",
          salesChannelIds: ["sc_other"],
        },
      ],
    })

    await GET(req, res)

    expect(getJsonPayload(res).products).toEqual([])
    expect(getJsonPayload(res).count).toBe(0)
  })

  it("returns a published product linked to the visible sales channel", async () => {
    const { req, res } = createCatalogHarness({
      products: [
        {
          id: "prod_visible",
          title: "Visible product",
          status: "published",
          salesChannelIds: ["sc_visible"],
        },
      ],
    })

    await GET(req, res)

    expect(getJsonPayload(res).products).toEqual([
      expect.objectContaining({
        id: "prod_visible",
        title: "Visible product",
      }),
    ])
    expect(getJsonPayload(res).count).toBe(1)
  })

  it("passes price filters to Meilisearch before applying visibility", async () => {
    const { req, res, meiliSearch } = createCatalogHarness({
      products: [
        {
          id: "prod_visible",
          title: "Visible product",
          status: "published",
          salesChannelIds: ["sc_visible"],
          facetPrice: 15,
        },
      ],
      query: {
        price_min: 10,
        price_max: 20,
      },
    })

    await GET(req, res)

    expect(meiliSearch).toHaveBeenCalledWith(
      "products",
      "",
      expect.objectContaining({
        filter: expect.arrayContaining([
          "facet_price >= 10",
          "facet_price <= 20",
        ]),
      })
    )
    expect(getJsonPayload(res).products).toHaveLength(1)
  })

  it("paginates and counts only visible products while preserving Meili order", async () => {
    const { req, res } = createCatalogHarness({
      products: [
        {
          id: "prod_hidden_channel",
          title: "Hidden channel product",
          status: "published",
          salesChannelIds: ["sc_other"],
        },
        {
          id: "prod_visible_1",
          title: "Visible product 1",
          status: "published",
          salesChannelIds: ["sc_visible"],
        },
        {
          id: "prod_draft",
          title: "Draft product",
          status: "draft",
          salesChannelIds: ["sc_visible"],
        },
        {
          id: "prod_visible_2",
          title: "Visible product 2",
          status: "published",
          salesChannelIds: ["sc_visible"],
        },
        {
          id: "prod_visible_3",
          title: "Visible product 3",
          status: "published",
          salesChannelIds: ["sc_visible"],
        },
      ],
      query: {
        page: 2,
        limit: 1,
      },
    })

    await GET(req, res)

    const payload = getJsonPayload(res)
    expect(
      payload.products.map((product: { id: string }) => product.id)
    ).toEqual(["prod_visible_2"])
    expect(payload.count).toBe(3)
    expect(payload.page).toBe(2)
    expect(payload.limit).toBe(1)
    expect(payload.totalPages).toBe(3)
  })

  it("derives facet counts and price stats only from visible products", async () => {
    const { req, res } = createCatalogHarness({
      products: [
        {
          id: "prod_hidden_channel",
          title: "Hidden channel product",
          status: "published",
          salesChannelIds: ["sc_other"],
          statusFacets: ["action"],
          formFacets: ["form-tablets"],
          brandFacets: ["brand-hidden"],
          ingredientFacets: ["ingredient-hidden"],
          facetPrice: 99,
        },
        {
          id: "prod_draft",
          title: "Draft product",
          status: "draft",
          salesChannelIds: ["sc_visible"],
          statusFacets: ["action"],
          formFacets: ["form-tablets"],
          brandFacets: ["brand-hidden"],
          ingredientFacets: ["ingredient-hidden"],
          facetPrice: 88,
        },
        {
          id: "prod_visible",
          title: "Visible product",
          status: "published",
          salesChannelIds: ["sc_visible"],
          statusFacets: ["in-stock"],
          formFacets: ["form-capsules"],
          brandFacets: ["brand-visible"],
          ingredientFacets: ["ingredient-visible"],
          facetPrice: 12,
        },
      ],
    })

    await GET(req, res)

    const payload = getJsonPayload(res)
    expect(
      payload.facets.status.find((item: { id: string }) => item.id === "action")
        .count
    ).toBe(0)
    expect(
      payload.facets.status.find(
        (item: { id: string }) => item.id === "in-stock"
      ).count
    ).toBe(1)
    expect(payload.facets.brand).toEqual([
      {
        id: "brand-visible",
        label: "visible",
        count: 1,
      },
    ])
    expect(payload.facets.ingredient).toEqual([
      {
        id: "ingredient-visible",
        label: "visible",
        count: 1,
      },
    ])
    expect(payload.facets.price).toEqual({
      min: 12,
      max: 12,
    })
  })
})
