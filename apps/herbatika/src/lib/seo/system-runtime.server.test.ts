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
  listPublicEntityProjections: vi.fn(),
}))

import { systemSitemapDependencies } from "./system-runtime.server"

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
    ["category", "/store/url-registry/categories/assignments"],
    ["brand", "/store/url-registry/brands/assignments"],
    ["collection", "/store/url-registry/collections/assignments"],
  ] as const)("uses the bounded %s assignment endpoint", async (kind, path) => {
    mocks.fetch.mockResolvedValue({
      count: 1,
      items: [assignment("source_1", "public-slug")],
      limit: 100,
      offset: 0,
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
    expect(mocks.fetch).toHaveBeenCalledWith(path, {
      query: { limit: 100, offset: 0 },
      signal: expect.any(AbortSignal),
    })
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
})
