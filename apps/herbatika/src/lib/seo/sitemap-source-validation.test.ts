import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { SitemapEntitySourceCandidate } from "./sitemap-contract"
import {
  type CatalogSitemapSourceDependencies,
  type CmsSitemapSourceDependencies,
  validateCatalogSitemapSources,
  validateCmsEntitySitemapSources,
  validateCmsStaticSitemapSources,
  validateProductSitemapSources,
} from "./sitemap-source-validation"

const binding = {
  locale: "cs-CZ",
  market: "cz",
  salesChannelId: "sc_cz",
} as const satisfies Pick<
  MarketRuntimeBinding,
  "locale" | "market" | "salesChannelId"
>

const source = (
  sourceId: string,
  publicSlug = `slug-${sourceId.replaceAll("_", "-")}`
): SitemapEntitySourceCandidate => ({
  publicSlug,
  routeId: `route_${sourceId}`,
  sourceId,
})

const assignment = (
  sourceId: string,
  publicSlug = `slug-${sourceId.replaceAll("_", "-")}`,
  patch: Record<string, unknown> = {}
) => ({
  entityId: sourceId,
  id: sourceId,
  marketCode: "cz",
  publicationStatus: "published",
  publicSlug,
  salesChannelId: "sc_cz",
  schemaVersion: 1,
  sourceVersion: "1",
  ...patch,
})

const catalogDependencies = (
  items: readonly unknown[]
): CatalogSitemapSourceDependencies => ({
  readAssignments: vi.fn().mockResolvedValue({
    assignments: items,
    entityKind: "category",
    marketCode: "cz",
    schemaVersion: 1,
  }),
})

const cmsDependencies = (
  overrides: Partial<CmsSitemapSourceDependencies> = {}
): CmsSitemapSourceDependencies => ({
  readArticle: vi.fn().mockResolvedValue({
    kind: "found",
    value: {
      id: "article_1",
      publishedDate: "2026-08-19T12:00:00.000Z",
      slug: "healthy-advice",
      title: "Healthy advice",
    },
  }),
  readPage: vi.fn().mockResolvedValue({
    kind: "found",
    value: {
      id: "page_1",
      publishedDate: "2026-08-19T13:00:00.000Z",
      slug: "delivery",
      title: "Delivery",
    },
  }),
  readStaticPage: vi.fn().mockResolvedValue({
    kind: "found",
    value: {
      id: "static_1",
      publishedDate: "2026-08-19T14:00:00.000Z",
      slug: "legacy-static-slug",
      title: "Privacy",
    },
  }),
  ...overrides,
})

describe("sitemap source validation", () => {
  it("intersects catalog routes with exact published market assignments", async () => {
    const dependencies = catalogDependencies([
      assignment("cat_1"),
      assignment("cat_stale", "old-slug"),
    ])

    await expect(
      validateCatalogSitemapSources(
        {
          binding,
          kind: "category",
          sources: [
            source("cat_1"),
            source("cat_stale", "new-slug"),
            source("cat_missing"),
          ],
        },
        dependencies
      )
    ).resolves.toEqual({
      kind: "found",
      value: [{ routeId: "route_cat_1" }],
    })
    expect(dependencies.readAssignments).toHaveBeenCalledWith({
      binding,
      kind: "category",
      sources: [
        source("cat_1"),
        source("cat_stale", "new-slug"),
        source("cat_missing"),
      ],
    })
  })

  it("fails closed for cross-market assignment data and dependency outages", async () => {
    await expect(
      validateCatalogSitemapSources(
        { binding, kind: "brand", sources: [source("brand_1")] },
        {
          readAssignments: vi.fn().mockResolvedValue({
            assignments: [
              assignment("brand_1", "slug-brand-1", { marketCode: "sk" }),
            ],
            entityKind: "brand",
            marketCode: "cz",
            schemaVersion: 1,
          }),
        }
      )
    ).resolves.toEqual({
      causeCode: "INVALID_SITEMAP_ASSIGNMENT_BATCH_RESPONSE",
      kind: "invalid-response",
    })

    await expect(
      validateCatalogSitemapSources(
        { binding, kind: "collection", sources: [source("col_1")] },
        {
          readAssignments: vi
            .fn()
            .mockRejectedValue(
              Object.assign(new Error("down"), { status: 503 })
            ),
        }
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })

  it("validates CMS stable IDs, exact locale slugs, and content timestamps", async () => {
    const dependencies = cmsDependencies()
    await expect(
      validateCmsEntitySitemapSources(
        {
          kind: "article",
          locale: "cs-CZ",
          sources: [source("article_1", "healthy-advice")],
        },
        dependencies
      )
    ).resolves.toEqual({
      kind: "found",
      value: [
        {
          routeId: "route_article_1",
          updatedAt: "2026-08-19T12:00:00.000Z",
        },
      ],
    })
    expect(dependencies.readArticle).toHaveBeenCalledWith("article_1", "cs-CZ")
  })

  it("omits missing or stale CMS entries but rejects a wrong stable ID", async () => {
    const staleDependencies = cmsDependencies({
      readPage: vi
        .fn()
        .mockResolvedValueOnce({ kind: "missing" })
        .mockResolvedValueOnce({
          kind: "found",
          value: { id: "page_2", slug: "old-slug", title: "Old" },
        }),
    })
    await expect(
      validateCmsEntitySitemapSources(
        {
          kind: "page",
          locale: "cs-CZ",
          sources: [source("page_1", "missing"), source("page_2", "new-slug")],
        },
        staleDependencies
      )
    ).resolves.toEqual({ kind: "found", value: [] })

    await expect(
      validateCmsEntitySitemapSources(
        {
          kind: "page",
          locale: "cs-CZ",
          sources: [source("page_1", "delivery")],
        },
        cmsDependencies({
          readPage: vi.fn().mockResolvedValue({
            kind: "found",
            value: { id: "page_other", slug: "delivery", title: "Wrong" },
          }),
        })
      )
    ).resolves.toEqual({
      causeCode: "INVALID_CMS_SOURCE_IDENTITY",
      kind: "invalid-response",
    })
  })

  it("includes only configured root-static CMS pages", async () => {
    const dependencies = cmsDependencies()
    await expect(
      validateCmsStaticSitemapSources(
        {
          locale: "cs-CZ",
          sources: [
            { routeId: "route_privacy", staticRouteKey: "privacy" },
            { routeId: "route_information", staticRouteKey: "information" },
          ],
        },
        dependencies
      )
    ).resolves.toEqual({
      kind: "found",
      value: [
        {
          routeId: "route_privacy",
          updatedAt: "2026-08-19T14:00:00.000Z",
        },
      ],
    })
    expect(dependencies.readStaticPage).toHaveBeenCalledTimes(1)
    expect(dependencies.readStaticPage).toHaveBeenCalledWith("privacy", "cs-CZ")
  })

  it("keeps an unreviewed RO demo fallback out of sitemaps", async () => {
    const invalidResponse = {
      causeCode: "MISSING_STATIC_PAGE_BINDING_TERMS",
      kind: "invalid-response" as const,
    }
    const sourceInput = [{ routeId: "route_terms", staticRouteKey: "terms" }]

    await expect(
      validateCmsStaticSitemapSources(
        { locale: "ro-RO", sources: sourceInput },
        { readStaticPage: vi.fn().mockResolvedValue(invalidResponse) }
      )
    ).resolves.toEqual({ kind: "found", value: [] })

    await expect(
      validateCmsStaticSitemapSources(
        { locale: "sk-SK", sources: sourceInput },
        { readStaticPage: vi.fn().mockResolvedValue(invalidResponse) }
      )
    ).resolves.toEqual(invalidResponse)
  })

  it("fails the product shard when a URLR-active product source is missing", async () => {
    await expect(
      validateProductSitemapSources(
        { binding, sources: [source("prod_1")] },
        {
          readProducts: vi
            .fn()
            .mockRejectedValue(
              Object.assign(new Error("missing"), { status: 404 })
            ),
        }
      )
    ).resolves.toEqual({
      causeCode: "ACTIVE_PRODUCT_SOURCE_MISSING",
      kind: "invalid-response",
    })
  })

  it("validates large product inputs in strict batches of at most 100", async () => {
    const sources = Array.from({ length: 205 }, (_, index) =>
      source(`prod_${index}`)
    )
    const readProducts = vi.fn().mockImplementation(({ sources: batch }) =>
      Promise.resolve({
        marketCode: "cz",
        schemaVersion: 1,
        sources: batch.map((candidate: SitemapEntitySourceCandidate) => ({
          entityId: candidate.sourceId,
          marketCode: "cz",
          publicSlug: candidate.publicSlug,
          salesChannelId: "sc_cz",
          sourceVersion: "2026-08-19T00:00:00.000Z",
          translation: {
            localeCode: "cs-CZ",
            reference: "product",
            translationId: `translation_${candidate.sourceId}`,
          },
        })),
      })
    )

    const result = await validateProductSitemapSources(
      { binding, sources },
      { readProducts }
    )

    expect(result.kind).toBe("found")
    expect(readProducts).toHaveBeenCalledTimes(3)
    expect(
      readProducts.mock.calls.map(([input]) => input.sources.length)
    ).toEqual([100, 100, 5])
  })

  it("fails closed when a batch response is reordered", async () => {
    const sources = [source("prod_1"), source("prod_2")]
    const responseSources = [...sources].reverse().map((candidate) => ({
      entityId: candidate.sourceId,
      marketCode: "cz",
      publicSlug: candidate.publicSlug,
      salesChannelId: "sc_cz",
      sourceVersion: "2026-08-19T00:00:00.000Z",
      translation: {
        localeCode: "cs-CZ",
        reference: "product",
        translationId: `translation_${candidate.sourceId}`,
      },
    }))

    await expect(
      validateProductSitemapSources(
        { binding, sources },
        {
          readProducts: vi.fn().mockResolvedValue({
            marketCode: "cz",
            schemaVersion: 1,
            sources: responseSources,
          }),
        }
      )
    ).resolves.toEqual({
      causeCode: "INVALID_PRODUCT_SITEMAP_BATCH_RESPONSE",
      kind: "invalid-response",
    })
  })
})
