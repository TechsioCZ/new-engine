import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "../../../src/api/store/catalog/products/route"
import type { decorateProductProjectionsWithTaxPrices } from "../../../src/api/store/products/product-projection-decorators"
import type { normalizeProductSalesChannelFilter } from "../../../src/api/utils/product-filters"
import type {
  loadSearchProfiles,
  resolveSearchProfile,
  SearchProfile,
} from "../../../src/modules/meilisearch/profiles"
import type { decorateProductsWithMeasurements } from "../../../src/utils/measurement-units"
import { MEILISEARCH } from "../../../src/workflows/meilisearch"

const profile: SearchProfile = {
  availability: "all",
  domain: "example.test",
  indexes: {
    brand: "brand_test",
    category: "category_test",
    content: "content_test",
    product: "product_test",
  },
  key: "test",
  limits: {
    autocomplete: { brand: 3, category: 3, content: 3, product: 6 },
    fullSearch: 50,
    page: 48,
    popular: 12,
  },
  locale: "sk",
  minimumRankingScore: 0,
  salesChannelIds: [],
  separateVariantResults: false,
  shop: "herbatika",
  strict: false,
}

vi.mock(
  import("../../../src/modules/meilisearch/profiles"),
  async (original) => ({
    ...(await original()),
    loadSearchProfiles: vi.fn<typeof loadSearchProfiles>(
      async () => await Promise.resolve([profile]),
    ),
    resolveSearchProfile: vi.fn<typeof resolveSearchProfile>(() => profile),
  }),
)

vi.mock(import("../../../src/api/utils/product-filters"), async (original) => ({
  ...(await original()),
  normalizeProductSalesChannelFilter: vi.fn<
    typeof normalizeProductSalesChannelFilter
  >(async (_query, _remote, filters) => await Promise.resolve(filters)),
}))

vi.mock(
  import("../../../src/api/store/products/product-projection-decorators"),
  () => ({
    decorateProductProjectionsWithTaxPrices: vi.fn<
      typeof decorateProductProjectionsWithTaxPrices
    >(async () => {
      await Promise.resolve()
    }),
  }),
)

vi.mock(import("../../../src/utils/measurement-units"), async (original) => ({
  ...(await original()),
  decorateProductsWithMeasurements: vi.fn<
    typeof decorateProductsWithMeasurements
  >(async (_scope, products) => await Promise.resolve(products)),
}))

const createResponse = () => {
  const json = vi.fn<(body: unknown) => void>()
  const status = vi.fn<(code: number) => { json: typeof json }>(() => ({
    json,
  }))
  return { json, status }
}

const createRequest = (options: {
  graph: (input: unknown) => Promise<unknown>
  search: (index: string, query: string, options: unknown) => Promise<unknown>
  validatedQuery?: Record<string, unknown>
}) => {
  const logger = {
    error: vi.fn<(message: string) => void>(),
    warn: vi.fn<(message: string) => void>(),
  }
  const queryService = { graph: vi.fn<typeof options.graph>(options.graph) }
  const meilisearch = { search: vi.fn<typeof options.search>(options.search) }
  const remoteQuery = vi.fn<() => void>()
  const resolve = vi.fn<(key: unknown) => unknown>((key) => {
    if (key === ContainerRegistrationKeys.LOGGER) {
      return logger
    }
    if (key === ContainerRegistrationKeys.QUERY) {
      return queryService
    }
    if (key === ContainerRegistrationKeys.REMOTE_QUERY) {
      return remoteQuery
    }
    if (key === MEILISEARCH) {
      return meilisearch
    }
    throw new Error(`Unexpected dependency: ${String(key)}`)
  })

  return {
    filterableFields: { sales_channel_id: ["sc_test"] },
    pricingContext: { currency_code: "eur" },
    queryConfig: { fields: ["id", "description"] },
    scope: { resolve },
    testQueryService: queryService,
    validatedQuery: {
      limit: 12,
      page: 1,
      q: "",
      sort: "recommended",
      ...options.validatedQuery,
    },
  }
}

const invokeGet = async (
  request: unknown,
  response: unknown,
): Promise<void> => {
  await Reflect.apply(GET, undefined, [request, response])
}

describe("catalog route correctness regressions", () => {
  beforeEach(() => {
    process.env["MEILISEARCH_ENABLED"] = "1"
  })

  afterEach(() => {
    delete process.env["MEILISEARCH_ENABLED"]
    vi.clearAllMocks()
  })

  it("fails clearly instead of dropping active constraints in degraded fallback", async () => {
    const request = createRequest({
      graph: async () => await Promise.resolve({ data: [] }),
      search: async () => await Promise.reject(new Error("search unavailable")),
      validatedQuery: {
        brand: "brand-herbatika",
        category_id: "pcat_vitamins",
        form: "form-capsules",
        ingredient: "ingredient-magnesium",
        price_max: 40,
        price_min: 10,
        sort: "price-asc",
        status: "in-stock",
      },
    })
    const response = createResponse()

    await invokeGet(request, response)

    expect(response.status).toHaveBeenCalledWith(503)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CATALOG_SEARCH_UNAVAILABLE_FOR_CONSTRAINED_QUERY",
      }),
    )
  })

  it("uses pricing-context currency and preserves unfiltered price bounds", async () => {
    const products = [
      {
        description: "Euro product",
        handle: "euro-product",
        id: "prod_eur",
        status: ProductStatus.PUBLISHED,
        title: "Euro product",
        variants: [
          {
            calculated_price: {
              calculated_amount: 20,
              currency_code: "eur",
            },
            id: "var_eur",
            title: "EUR",
          },
        ],
      },
      {
        description: "Lower-priced product",
        handle: "lower-priced-product",
        id: "prod_lower",
        status: ProductStatus.PUBLISHED,
        title: "Crown product",
        variants: [
          {
            calculated_price: {
              calculated_amount: 10,
              currency_code: "eur",
            },
            id: "var_lower",
            title: "EUR lower",
          },
        ],
      },
    ]
    const request = createRequest({
      graph: async (input) => {
        if (
          typeof input === "object" &&
          input !== null &&
          Reflect.get(input, "entity") === "product"
        ) {
          return await Promise.resolve({
            data: products,
            metadata: { count: 2 },
          })
        }
        return await Promise.resolve({ data: [] })
      },
      search: async () =>
        await Promise.resolve({
          estimatedTotalHits: 2,
          hits: [
            {
              facet_price: 20,
              facet_status: ["in-stock"],
              id: "prod_eur",
              search_product_id: "prod_eur",
            },
            {
              facet_price: 5,
              facet_status: ["in-stock"],
              id: "prod_lower",
              search_product_id: "prod_lower",
            },
          ],
        }),
      validatedQuery: { currency_code: "CZK", price_min: 15 },
    })
    const response = createResponse()

    await invokeGet(request, response)

    const responseBody: unknown = response.json.mock.calls[0]?.[0]
    expect(isRecord(responseBody)).toBeTruthy()
    if (!isRecord(responseBody)) {
      throw new Error("Expected catalog response body")
    }
    expect(responseBody["count"]).toBe(1)
    const { facets, products: responseProducts } = responseBody
    expect(isRecord(facets) && facets["price"]).toStrictEqual({
      max: 20,
      min: 10,
    })
    expect(
      Array.isArray(responseProducts) && responseProducts[0],
    ).toMatchObject({
      id: "prod_eur",
    })

    const graphCall: unknown = request.testQueryService.graph.mock.calls[0]?.[0]
    const graphFields = isRecord(graphCall) ? graphCall["fields"] : undefined
    expect(graphFields).toStrictEqual(
      expect.arrayContaining([
        "description",
        "variants.calculated_price.currency_code",
      ]),
    )
  })
})
