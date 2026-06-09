import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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

type MeiliPriceRange = { max?: number; min?: number }

const FACET_PRICE_MIN_FILTER_REGEX = /\bfacet_price >= ([0-9.]+)\b/
const FACET_PRICE_MAX_FILTER_REGEX = /\bfacet_price <= ([0-9.]+)\b/

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

const toFilterExpressions = (filter: unknown): unknown[] => {
  if (typeof filter === "string") {
    return [filter]
  }

  return Array.isArray(filter) ? filter : []
}

const getMeiliFilterValues = (filter: unknown, field: string): string[] => {
  const expressions = toFilterExpressions(filter)

  if (expressions.length === 0) {
    return []
  }

  const values: string[] = []
  const pattern = new RegExp(`${field} = "([^"]+)"`, "g")
  for (const expression of expressions) {
    if (typeof expression !== "string") {
      continue
    }

    for (const match of expression.matchAll(pattern)) {
      const value = match[1]
      if (value) {
        values.push(value)
      }
    }
  }

  return values
}

const getMeiliPriceRange = (filter: unknown): MeiliPriceRange => {
  const expressions = toFilterExpressions(filter)

  if (expressions.length === 0) {
    return {}
  }

  let min: number | undefined
  let max: number | undefined
  for (const expression of expressions) {
    if (typeof expression !== "string") {
      continue
    }

    const minMatch = expression.match(FACET_PRICE_MIN_FILTER_REGEX)
    if (minMatch?.[1]) {
      min = Number(minMatch[1])
    }
    const maxMatch = expression.match(FACET_PRICE_MAX_FILTER_REGEX)
    if (maxMatch?.[1]) {
      max = Number(maxMatch[1])
    }
  }

  return { min, max }
}

const productMatchesSearchFilters = (
  product: TestProduct,
  statusFilters: string[],
  salesChannelFilters: string[],
  priceRange: MeiliPriceRange
) => {
  const matchesStatus =
    statusFilters.length === 0 || statusFilters.includes(product.status)
  const matchesSalesChannel =
    salesChannelFilters.length === 0 ||
    product.salesChannelIds.some((id) => salesChannelFilters.includes(id))
  const isAboveMin =
    priceRange.min === undefined ||
    (product.facetPrice !== undefined && product.facetPrice >= priceRange.min)
  const isBelowMax =
    priceRange.max === undefined ||
    (product.facetPrice !== undefined && product.facetPrice <= priceRange.max)

  return matchesStatus && matchesSalesChannel && isAboveMin && isBelowMax
}

const createMockResponse = () =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
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

  const meiliSearch = vi.fn(
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
        filter?: string | string[]
      }
    ) => {
      const statusFilters = getMeiliFilterValues(
        options.filter,
        "facet_product_status"
      )
      const salesChannelFilters = getMeiliFilterValues(
        options.filter,
        "facet_sales_channel_ids"
      )
      const priceRange = getMeiliPriceRange(options.filter)
      const filteredProducts = products.filter((product) =>
        productMatchesSearchFilters(
          product,
          statusFilters,
          salesChannelFilters,
          priceRange
        )
      )

      const hits = filteredProducts
        .slice(
          options.paginationOptions.offset,
          options.paginationOptions.offset + options.paginationOptions.limit
        )
        .map((product) => ({ id: product.id }))

      const visiblePrices = filteredProducts
        .map((product) => product.facetPrice)
        .filter((price): price is number => typeof price === "number")

      const hiddenBrandCount = filteredProducts.filter((product) =>
        product.brandFacets?.includes("brand-hidden")
      ).length
      const visibleBrandCount = filteredProducts.filter((product) =>
        product.brandFacets?.includes("brand-visible")
      ).length
      const visibleIngredientCount = filteredProducts.filter((product) =>
        product.ingredientFacets?.includes("ingredient-visible")
      ).length

      return {
        hits,
        estimatedTotalHits: filteredProducts.length,
        facetDistribution: {
          facet_status: {
            action: filteredProducts.filter((product) =>
              product.statusFacets?.includes("action")
            ).length,
            "in-stock": filteredProducts.filter((product) =>
              product.statusFacets?.includes("in-stock")
            ).length,
          },
          facet_form: {},
          facet_brand: {
            ...(hiddenBrandCount > 0
              ? { "brand-hidden": hiddenBrandCount }
              : {}),
            ...(visibleBrandCount > 0
              ? { "brand-visible": visibleBrandCount }
              : {}),
          },
          facet_ingredient: {
            ...(visibleIngredientCount > 0
              ? { "ingredient-visible": visibleIngredientCount }
              : {}),
          },
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

  const queryGraph = vi.fn(async (config: GraphConfig) => {
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
      resolve: vi.fn((key: string) => {
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
  const originalMeilisearchEnabled = process.env.MEILISEARCH_ENABLED

  beforeEach(() => {
    process.env.MEILISEARCH_ENABLED = "1"
  })

  afterEach(() => {
    if (originalMeilisearchEnabled === undefined) {
      delete process.env.MEILISEARCH_ENABLED
      return
    }

    process.env.MEILISEARCH_ENABLED = originalMeilisearchEnabled
  })

  it("returns unavailable without loading Meilisearch when search is disabled", async () => {
    process.env.MEILISEARCH_ENABLED = "0"
    const { req, res, meiliSearch, queryGraph } = createCatalogHarness({
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

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({
      message: "Catalog search is disabled",
    })
    expect(req.scope.resolve).not.toHaveBeenCalled()
    expect(meiliSearch).not.toHaveBeenCalled()
    expect(queryGraph).not.toHaveBeenCalled()
  })

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

    const searchOptions = meiliSearch.mock.calls[0]?.[2]
    expect(searchOptions?.filter).toContain("facet_price >= 10")
    expect(searchOptions?.filter).toContain("facet_price <= 20")
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

  it("uses indexed visibility filters instead of scanning all Meili hits", async () => {
    const products = Array.from({ length: 250 }, (_, index) => ({
      id: `prod_${index}`,
      title: `Product ${index}`,
      status: "published" as const,
      salesChannelIds: ["sc_visible"],
    }))
    const { req, res, meiliSearch } = createCatalogHarness({
      products,
      query: {
        limit: 12,
      },
    })

    await GET(req, res)

    expect(meiliSearch).toHaveBeenCalledTimes(1)
    const searchOptions = meiliSearch.mock.calls[0]?.[2]
    expect(searchOptions?.filter).toContain(
      'facet_product_status = "published"'
    )
    expect(searchOptions?.filter).toContain(
      'facet_sales_channel_ids = "sc_visible"'
    )
    expect(getJsonPayload(res).products).toHaveLength(12)
    expect(getJsonPayload(res).count).toBe(250)
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
