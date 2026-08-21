import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SearchProfile } from "../../../../../modules/meilisearch/profiles"
import { MEILISEARCH } from "../../../../../workflows/meilisearch"

const mocks = vi.hoisted(() => ({
  loadSearchProfiles: vi.fn(),
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
    fullSearch: 1000,
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

const createRoute = (
  market: (typeof MARKETS)[number],
  sort: "price-asc" | "price-desc"
) => {
  const graph = vi.fn()
  const search = vi.fn().mockRejectedValue(new Error("index unavailable"))
  const warn = vi.fn()
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
    if (registrationName === ContainerRegistrationKeys.LOGGER) {
      return { warn }
    }
    throw new Error(`Unexpected registration: ${registrationName}`)
  })
  const response = createResponse()
  const request = {
    filterableFields: { sales_channel_id: market.salesChannelId },
    locale: market.locale,
    pricingContext: {
      currency_code: market.currency,
      region_id: `reg_${market.key}`,
    },
    publishable_key_context: {
      sales_channel_ids: [market.salesChannelId],
    },
    queryConfig: { fields: [] },
    scope: { resolve },
    validatedQuery: {
      currency_code: market.currency,
      limit: 20,
      page: 1,
      profile: market.key,
      q: "",
      sort,
    },
  }

  return { graph, request, response, search, warn }
}

describe.each(MARKETS)("$key degraded catalog price sorting", (market) => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadSearchProfiles.mockResolvedValue(MARKETS.map(profile))
  })

  it.each([
    "price-asc",
    "price-desc",
  ] as const)("fails closed for %s instead of returning a wrongly ordered page", async (sort) => {
    const { graph, request, response, search, warn } = createRoute(market, sort)

    await GET(request as never, response as never)

    expect(search).toHaveBeenCalledWith(
      `product_${market.key}`,
      "",
      expect.objectContaining({
        filter: expect.stringContaining(
          `facet_sales_channel_ids = "${market.salesChannelId}"`
        ),
        paginationOptions: { limit: 20, offset: 0 },
        additionalOptions: expect.objectContaining({
          sort: [`facet_price:${sort === "price-asc" ? "asc" : "desc"}`],
        }),
      })
    )
    expect(response.status).toHaveBeenCalledWith(503)
    expect(response.json).toHaveBeenCalledWith({
      code: "CATALOG_PRICE_SORT_UNAVAILABLE_DEGRADED",
      message: "Price sorting is unavailable while catalog search is degraded",
      search: {
        degraded: true,
        exactIdentifierMatch: false,
        profile: market.key,
      },
    })
    expect(graph).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("price-sorted degraded fallback is unavailable")
    )
  })
})
