import { beforeEach, describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  readArticle: vi.fn(),
  readPage: vi.fn(),
  readProduct: vi.fn(),
  readStaticPage: vi.fn(),
}))

const binding = {
  acceptedHosts: ["herbatica.cz"],
  canonicalOrigin: "https://herbatica.cz",
  countryCode: "CZ",
  locale: "cs-CZ",
  market: "cz",
  publishableApiKey: "pk_cz",
  publishableApiKeyId: "pkid_cz",
  regionId: "reg_cz",
  salesChannelId: "sc_cz",
} as const satisfies MarketRuntimeBinding

vi.mock("server-only", () => ({}))
vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRuntime: vi.fn(),
}))
vi.mock("@/lib/storefront/cms", () => ({
  readCmsArticleById: mocks.readArticle,
  readCmsPageById: mocks.readPage,
  readCmsStaticPage: mocks.readStaticPage,
}))
vi.mock("@/lib/storefront/market-sdk.server", () => ({
  getMarketStorefrontSdk: () => ({
    binding,
    sdk: { client: { fetch: mocks.fetch } },
  }),
}))
vi.mock("@/lib/storefront/product-route-source.server", () => ({
  readProductRouteSourceFromMedusa: mocks.readProduct,
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: vi.fn(),
}))
vi.mock("@/lib/url-registry/runtime/public-projections.server", () => ({
  countPublicIndexableEntityProjections: vi.fn(),
  listPublicEntityProjections: vi.fn(),
  listPublicIndexableEntityProjectionPage: vi.fn(),
}))

import {
  systemProductFeedDependencies,
  systemSitemapDependencies,
} from "./system-runtime.server"

const assignment = (entityId: string, publicSlug: string) => ({
  entityId,
  id: entityId,
  marketCode: "cz",
  publicationStatus: "published",
  publicSlug,
  salesChannelId: "sc_cz",
  schemaVersion: 1,
  sourceVersion: "1",
})

describe("system sitemap source wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    "category",
    "brand",
    "collection",
  ] as const)("uses the bounded %s assignment endpoint", async (kind) => {
    mocks.fetch.mockResolvedValue({
      assignments: [assignment("source_1", "public-slug")],
      entityKind: kind,
      marketCode: "cz",
      schemaVersion: 1,
    })

    await expect(
      systemSitemapDependencies.validateEntitySources({
        kind,
        market: "cz",
        sources: [
          {
            publicSlug: "public-slug",
            routeId: "route_1",
            sourceId: "source_1",
          },
        ],
      })
    ).resolves.toEqual({
      kind: "found",
      value: [{ routeId: "route_1" }],
    })
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/store/url-registry/catalog/sources",
      {
        body: {
          candidates: [{ entityId: "source_1", publicSlug: "public-slug" }],
          entityKind: kind,
          market: "cz",
          schemaVersion: 1,
        },
        method: "POST",
        signal: expect.any(AbortSignal),
      }
    )
  })

  it("reads a CMS article by stable ID and exact market locale", async () => {
    mocks.readArticle.mockResolvedValue({
      kind: "found",
      value: {
        id: "article_1",
        slug: "healthy-advice",
        title: "Healthy advice",
      },
    })

    await expect(
      systemSitemapDependencies.validateEntitySources({
        kind: "article",
        market: "cz",
        sources: [
          {
            publicSlug: "healthy-advice",
            routeId: "route_article_1",
            sourceId: "article_1",
          },
        ],
      })
    ).resolves.toEqual({
      kind: "found",
      value: [{ routeId: "route_article_1", updatedAt: undefined }],
    })
    expect(mocks.readArticle).toHaveBeenCalledWith("article_1", "cs-CZ")
  })

  it("reads product-feed details through one bounded Store list request", async () => {
    const payload = { products: [{ id: "prod_1" }, { id: "prod_2" }] }
    mocks.fetch.mockResolvedValue(payload)

    await expect(
      systemProductFeedDependencies.readProducts({
        market: "cz",
        sources: [
          {
            productId: "prod_1",
            publicSlug: "product-1",
            routeId: "route_1",
          },
          {
            productId: "prod_2",
            publicSlug: "product-2",
            routeId: "route_2",
          },
        ],
      })
    ).resolves.toBe(payload)
    expect(mocks.fetch).toHaveBeenCalledWith("/store/products", {
      query: expect.objectContaining({
        country_code: "cz",
        id: ["prod_1", "prod_2"],
        limit: 2,
        locale: "cs-CZ",
        region_id: "reg_cz",
      }),
      signal: expect.any(AbortSignal),
    })
  })
})
