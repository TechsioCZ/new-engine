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
  listAssignments: vi.fn().mockResolvedValue({
    count: items.length,
    items,
    limit: 100,
    offset: 0,
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
      assignment("cat_unrouted"),
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
    expect(dependencies.listAssignments).toHaveBeenCalledWith({
      binding,
      kind: "category",
      limit: 100,
      offset: 0,
    })
  })

  it("fails closed for cross-market assignment data and dependency outages", async () => {
    await expect(
      validateCatalogSitemapSources(
        { binding, kind: "brand", sources: [source("brand_1")] },
        catalogDependencies([
          assignment("brand_1", "slug-brand-1", { marketCode: "sk" }),
        ])
      )
    ).resolves.toEqual({
      causeCode: "INVALID_SITEMAP_ASSIGNMENT_LIST_RESPONSE",
      kind: "invalid-response",
    })

    await expect(
      validateCatalogSitemapSources(
        { binding, kind: "collection", sources: [source("col_1")] },
        {
          listAssignments: vi
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

  it("fails the product shard when a URLR-active product source is missing", async () => {
    await expect(
      validateProductSitemapSources(
        { market: "cz", sources: [source("prod_1")] },
        { readProduct: vi.fn().mockResolvedValue({ kind: "missing" }) }
      )
    ).resolves.toEqual({
      causeCode: "ACTIVE_PRODUCT_SOURCE_MISSING",
      kind: "invalid-response",
    })
  })
})
