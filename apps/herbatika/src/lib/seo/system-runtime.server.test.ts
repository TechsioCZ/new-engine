import { beforeEach, describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"

const mocks = vi.hoisted(() => ({
  assertReviewedStaticSource: vi.fn(),
  fetch: vi.fn(),
  fetchBlogPosts: vi.fn(),
  fetchHeroBanners: vi.fn(),
  hydrateHeroBanners: vi.fn(),
  loadStaticPublication: vi.fn(),
  prefetchHomepage: vi.fn(),
  readAvailableSlugs: vi.fn(),
  readArticle: vi.fn(),
  readCompleteSlugs: vi.fn(),
  readHomepageManifest: vi.fn(),
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
  fetchCachedLatestCmsBlogPosts: mocks.fetchBlogPosts,
  fetchCmsHeroBanners: mocks.fetchHeroBanners,
  readCmsArticleById: mocks.readArticle,
  readCmsPageById: mocks.readPage,
  readCmsStaticPage: mocks.readStaticPage,
}))
vi.mock("@/lib/storefront/cms-hero-targets.server", () => ({
  hydrateCmsHeroBannerTargets: mocks.hydrateHeroBanners,
}))
vi.mock("@/lib/storefront/homepage-hero-source-manifest.server", () => ({
  readReviewedHomepageHeroBanners: mocks.readHomepageManifest,
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
vi.mock("@/lib/storefront/ssr", () => ({
  prefetchHomePageStorefrontData: mocks.prefetchHomepage,
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readAvailablePublicEntitySlugs: mocks.readAvailableSlugs,
  readCompletePublicEntitySlugs: mocks.readCompleteSlugs,
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: vi.fn(),
}))
vi.mock("@/lib/url/segment-registry-publication.server", () => ({
  loadStaticRoutePublicationDecision: mocks.loadStaticPublication,
}))
vi.mock(
  "@/lib/url/segment-registry-publication/reviewed-source.server",
  () => ({
    assertReviewedStaticRouteSource: mocks.assertReviewedStaticSource,
  })
)
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
    mocks.fetchBlogPosts.mockResolvedValue([])
    mocks.fetchHeroBanners.mockResolvedValue([
      { id: "cms-home", imageSrc: "/cms-home.avif" },
    ])
    mocks.hydrateHeroBanners.mockResolvedValue({
      kind: "found",
      value: [{ id: "cms-home", imageSrc: "/cms-home.avif" }],
    })
    mocks.prefetchHomepage.mockResolvedValue({
      categorySourceIds: ["cat_1"],
      homepageSectionCategorySourceIds: {
        "aktuálne-v.zlave": "cat_sale",
        "najoblubenejsie-produkty": "cat_best",
        novinky: "cat_new",
      },
      region: { id: "reg_cz" },
      visibleProductIds: ["prod_1"],
    })
    mocks.readAvailableSlugs.mockResolvedValue({ kind: "found", value: {} })
    mocks.readCompleteSlugs.mockResolvedValue({ kind: "found", value: {} })
    mocks.readHomepageManifest.mockReturnValue(undefined)
    mocks.assertReviewedStaticSource.mockResolvedValue(undefined)
    mocks.loadStaticPublication.mockResolvedValue({
      evidence: {
        editorialApprovalReference: "CZ-EDITORIAL-static",
        frozenRegistrySha256: "f".repeat(64),
        legalApprovalReference: "CZ-LEGAL-static",
        staticContentArtifactRef: "market-static-content/cz/privacy.json",
        staticContentArtifactSha256: "a".repeat(64),
      },
      kind: "approved",
    })
  })

  it("publishes a homepage only when every hard SSR source is ready", async () => {
    await expect(
      systemSitemapDependencies.validateHomepageSource("cz")
    ).resolves.toEqual({ kind: "found", value: true })

    expect(mocks.prefetchHomepage).toHaveBeenCalledWith({ market: "cz" })
    expect(mocks.readCompleteSlugs).toHaveBeenCalledWith({
      kind: "category",
      market: "cz",
      requiredSourceIds: ["cat_1"],
    })
    expect(mocks.readAvailableSlugs).toHaveBeenCalledWith({
      kind: "product",
      market: "cz",
      requiredSourceIds: ["prod_1"],
    })
  })

  it("keeps the Romanian demo hero out of homepage publication", async () => {
    mocks.fetchHeroBanners.mockResolvedValue([])

    await expect(
      systemSitemapDependencies.validateHomepageSource("ro")
    ).resolves.toEqual({ kind: "unavailable" })
    expect(mocks.hydrateHeroBanners).not.toHaveBeenCalled()
  })

  it.each([
    [
      "missing region",
      () =>
        mocks.prefetchHomepage.mockResolvedValue({
          categorySourceIds: [],
          homepageSectionCategorySourceIds: {},
          region: null,
          visibleProductIds: [],
        }),
    ],
    [
      "incomplete market categories",
      () =>
        mocks.prefetchHomepage.mockResolvedValue({
          categorySourceIds: [],
          homepageSectionCategorySourceIds: {},
          region: { id: "reg_cz" },
          visibleProductIds: [],
        }),
    ],
    [
      "missing URLR category projections",
      () => mocks.readCompleteSlugs.mockResolvedValue({ kind: "unavailable" }),
    ],
  ] as const)("fails closed for %s", async (_case, arrange) => {
    arrange()

    const result = await systemSitemapDependencies.validateHomepageSource("cz")

    expect(result.kind).not.toBe("found")
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

  it("binds an indexable static sitemap source to its reviewed payload", async () => {
    const page = {
      content: "Reviewed privacy content",
      id: 77,
      publishedDate: "2026-08-21T10:00:00.000Z",
      title: "Privacy",
    }
    mocks.readStaticPage.mockResolvedValue({ kind: "found", value: page })

    await expect(
      systemSitemapDependencies.validateStaticSources({
        market: "cz",
        sources: [{ routeId: "route_privacy", staticRouteKey: "privacy" }],
      })
    ).resolves.toEqual({
      kind: "found",
      value: [
        {
          routeId: "route_privacy",
          updatedAt: "2026-08-21T10:00:00.000Z",
        },
      ],
    })
    expect(mocks.assertReviewedStaticSource).toHaveBeenCalledWith(
      expect.objectContaining({
        market: "cz",
        pageKey: "privacy",
        renderedSource: page,
      })
    )
  })

  it("fails the static sitemap closed after approved CMS content drifts", async () => {
    mocks.readStaticPage.mockResolvedValue({
      kind: "found",
      value: { content: "Drifted", id: 77, title: "Privacy" },
    })
    mocks.assertReviewedStaticSource.mockRejectedValueOnce(
      new Error("content drift")
    )

    await expect(
      systemSitemapDependencies.validateStaticSources({
        market: "cz",
        sources: [{ routeId: "route_privacy", staticRouteKey: "privacy" }],
      })
    ).resolves.toEqual({
      causeCode: "STATIC_CONTENT_REVIEW_BINDING_FAILED",
      kind: "invalid-response",
    })
  })

  it("omits an RO demo substitution from static sitemap validation", async () => {
    mocks.readStaticPage.mockResolvedValue({
      kind: "found",
      value: {
        content: "Demo",
        id: "demo-generated-unreviewed:ro:terms",
        title: "Terms",
      },
    })

    await expect(
      systemSitemapDependencies.validateStaticSources({
        market: "cz",
        sources: [{ routeId: "route_terms", staticRouteKey: "terms" }],
      })
    ).resolves.toEqual({ kind: "found", value: [] })
    expect(mocks.assertReviewedStaticSource).not.toHaveBeenCalled()
  })

  it("omits taxonomy-noindex static sources without reading CMS", async () => {
    mocks.loadStaticPublication.mockResolvedValueOnce({
      kind: "not-required",
      reason: "route-not-indexable",
    })

    await expect(
      systemSitemapDependencies.validateStaticSources({
        market: "cz",
        sources: [{ routeId: "route_contact", staticRouteKey: "contact" }],
      })
    ).resolves.toEqual({ kind: "found", value: [] })
    expect(mocks.readStaticPage).not.toHaveBeenCalled()
    expect(mocks.assertReviewedStaticSource).not.toHaveBeenCalled()
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
