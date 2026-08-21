import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SearchProfile } from "../../../../../modules/meilisearch/profiles"
import { MEILISEARCH } from "../../../../../workflows/meilisearch"

const mocks = vi.hoisted(() => ({
  loadSearchProfiles: vi.fn(),
  normalizeProductSalesChannelFilter: vi.fn(
    async (
      _query: unknown,
      _remoteQuery: unknown,
      filters: Record<string, unknown>
    ) => filters
  ),
  wrapProductsWithTaxPrices: vi.fn(),
}))

vi.mock("../../../../../modules/meilisearch/env", () => ({
  isMeilisearchEnabled: () => true,
}))

vi.mock(
  "../../../../../modules/meilisearch/profiles",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../../../../modules/meilisearch/profiles")
    >()),
    loadSearchProfiles: mocks.loadSearchProfiles,
  })
)

vi.mock("../../../../utils/product-filters", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../utils/product-filters")
  >()),
  normalizeProductSalesChannelFilter: mocks.normalizeProductSalesChannelFilter,
}))

vi.mock(
  "@medusajs/medusa/api/store/products/helpers",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@medusajs/medusa/api/store/products/helpers")
    >()),
    wrapProductsWithTaxPrices: mocks.wrapProductsWithTaxPrices,
  })
)

import { GET } from "../route"

const MARKETS = [
  { currency: "eur", key: "sk", locale: "sk-SK", salesChannelId: "sc_sk" },
  { currency: "czk", key: "cz", locale: "cs-CZ", salesChannelId: "sc_cz" },
  { currency: "huf", key: "hu", locale: "hu-HU", salesChannelId: "sc_hu" },
  { currency: "ron", key: "ro", locale: "ro-RO", salesChannelId: "sc_ro" },
] as const

const profile = (market: (typeof MARKETS)[number]): SearchProfile => ({
  availability: "all",
  domain: market.key,
  indexes: {
    brand: `brand_${market.key}`,
    category: `category_${market.key}`,
    content: `content_${market.key}`,
    product: `product_${market.key}`,
  },
  key: market.key,
  limits: {
    autocomplete: { brand: 3, category: 3, content: 3, product: 6 },
    fullSearch: 100,
    page: 100,
    popular: 12,
  },
  locale: market.locale,
  minimumRankingScore: 0.55,
  salesChannelIds: [market.salesChannelId],
  separateVariantResults: false,
  shop: "herbatica",
  strict: false,
})

const createResponse = () => {
  const response = {
    json: vi.fn(),
    status: vi.fn(),
  }
  response.status.mockReturnValue(response)

  return response
}

const createRoute = (options: {
  current?: (typeof MARKETS)[number]
  filterSalesChannelId?: string
  meiliSearch?: ReturnType<typeof vi.fn>
  pricingCurrency?: string
  queryCurrency?: string
  queryLocale?: string
  requestedProfile?: string
}) => {
  const current = options.current ?? MARKETS[1]
  const graph = vi.fn().mockResolvedValue({
    data: [
      {
        id: "prod_authoritative",
        title: "Authoritative catalog title",
        variants: [{ id: "variant_authoritative" }],
      },
    ],
  })
  const search =
    options.meiliSearch ??
    vi.fn(async (index: string) => ({
      hits: index.startsWith("product_")
        ? [
            {
              _rankingScore: 0.99,
              id: "untrusted-search-document-id",
              search_product_id: "prod_authoritative",
              title: "Untrusted indexed title",
            },
          ]
        : [],
    }))
  const resolve = vi.fn((registrationName: string) => {
    if (registrationName === MEILISEARCH) {
      return { search }
    }
    if (registrationName === ContainerRegistrationKeys.QUERY) {
      return { graph }
    }
    if (registrationName === ContainerRegistrationKeys.REMOTE_QUERY) {
      return vi.fn()
    }
    throw new Error(`Unexpected registration: ${registrationName}`)
  })
  const response = createResponse()
  const request = {
    filterableFields: {
      sales_channel_id: options.filterSalesChannelId ?? current.salesChannelId,
    },
    locale: current.locale,
    pricingContext: {
      currency_code: options.pricingCurrency ?? current.currency,
      region_id: `reg_${current.key}`,
    },
    publishable_key_context: {
      sales_channel_ids: [current.salesChannelId],
    },
    scope: { resolve },
    validatedQuery: {
      currency_code: options.queryCurrency ?? current.currency,
      locale: options.queryLocale,
      profile: options.requestedProfile,
      q: "mag",
    },
  }

  return { graph, request, response, search }
}

describe("GET /store/search/autocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadSearchProfiles.mockResolvedValue(MARKETS.map(profile))
  })

  it("uses the trusted publishable-key channel and hydrates only authoritative products", async () => {
    const { graph, request, response, search } = createRoute({
      current: MARKETS[1],
      filterSalesChannelId: "sc_ro",
      requestedProfile: "cz",
    })

    await GET(request as never, response as never)

    expect(response.status).not.toHaveBeenCalled()
    expect(search).toHaveBeenCalledWith(
      "product_cz",
      "mag",
      expect.objectContaining({
        filter: expect.stringContaining('facet_sales_channel_ids = "sc_cz"'),
      })
    )
    expect(search.mock.calls[0]?.[2]?.filter).not.toContain("sc_ro")
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "product",
        filters: expect.objectContaining({
          id: { $in: ["prod_authoritative"] },
          sales_channel_id: ["sc_cz"],
        }),
      }),
      { locale: "cs-CZ" }
    )
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        products: [
          expect.objectContaining({
            id: "prod_authoritative",
            title: "Authoritative catalog title",
          }),
        ],
        profile: "cz",
      })
    )
    expect(response.json.mock.calls[0]?.[0]?.products).not.toContainEqual(
      expect.objectContaining({ title: "Untrusted indexed title" })
    )
    expect(mocks.wrapProductsWithTaxPrices).toHaveBeenCalledOnce()
  })

  it.each(
    MARKETS
  )("rejects a competing currency for the $key storefront", async (current) => {
    const competing = MARKETS[(MARKETS.indexOf(current) + 1) % MARKETS.length]
    const { graph, request, response, search } = createRoute({
      current,
      pricingCurrency: competing.currency,
      queryCurrency: competing.currency,
    })

    await GET(request as never, response as never)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      message: "Search currency does not match the storefront market",
    })
    expect(search).not.toHaveBeenCalled()
    expect(graph).not.toHaveBeenCalled()
    expect(mocks.wrapProductsWithTaxPrices).not.toHaveBeenCalled()
  })

  it.each(
    MARKETS
  )("rejects a rotating cross-market profile spoof from $key", async (current) => {
    const competing = MARKETS[(MARKETS.indexOf(current) + 1) % MARKETS.length]
    const { graph, request, response, search } = createRoute({
      current,
      requestedProfile: competing.key,
    })

    await GET(request as never, response as never)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      message: `Search profile ${competing.key} is not available for this storefront`,
    })
    expect(search).not.toHaveBeenCalled()
    expect(graph).not.toHaveBeenCalled()
  })

  it("rejects a same-channel profile whose locale disagrees with the trusted storefront locale", async () => {
    const mismatchedProfile = {
      ...profile(MARKETS[3]),
      key: "cz-ro-shadow",
      salesChannelIds: [MARKETS[1].salesChannelId],
    }
    mocks.loadSearchProfiles.mockResolvedValue([
      ...MARKETS.map(profile),
      mismatchedProfile,
    ])
    const { graph, request, response, search } = createRoute({
      current: MARKETS[1],
      requestedProfile: mismatchedProfile.key,
    })

    await GET(request as never, response as never)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      message: `Search profile ${mismatchedProfile.key} is not available for this storefront language`,
    })
    expect(search).not.toHaveBeenCalled()
    expect(graph).not.toHaveBeenCalled()
  })

  it("uses the server-resolved locale instead of a query locale spoof", async () => {
    const { request, response, search } = createRoute({
      current: MARKETS[3],
      queryLocale: "sk-SK",
    })

    await GET(request as never, response as never)

    expect(search).toHaveBeenCalledWith("product_ro", "mag", expect.any(Object))
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ profile: "ro" })
    )
  })

  it("falls back to the authoritative catalog and marks partial index failures degraded", async () => {
    const search = vi.fn(async (index: string) => {
      if (index.startsWith("product_") || index.startsWith("brand_")) {
        throw new Error("index temporarily unavailable")
      }
      return {
        hits: index.startsWith("category_")
          ? [{ id: "cat_1", name: "Minerals" }]
          : [{ href: "/about", id: "page_1", title: "About" }],
      }
    })
    const { graph, request, response } = createRoute({ meiliSearch: search })

    await GET(request as never, response as never)

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          q: "mag",
          sales_channel_id: ["sc_cz"],
          status: "published",
        }),
        pagination: { skip: 0, take: 6 },
      }),
      { locale: "cs-CZ" }
    )
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        brands: [],
        categories: [{ id: "cat_1", name: "Minerals" }],
        content: [{ href: "/about", id: "page_1", title: "About" }],
        degraded: true,
        products: [expect.objectContaining({ id: "prod_authoritative" })],
      })
    )
  })
})
