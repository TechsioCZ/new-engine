import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type {
  ActiveEntityRouteTarget,
  StaticRouteSnapshot,
} from "@/lib/url-registry/model"
import {
  parseSitemapShardName,
  type SitemapDataDependencies,
} from "./sitemap-contract"
import { listSitemapEntries, shardSitemapEntries } from "./sitemaps"

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

const projection = (
  sourceId: string,
  slug: string,
  indexPolicy: "indexable" | "noindex" = "indexable"
): ActiveEntityRouteTarget => ({
  currentSlug: {
    createdAt: "2026-08-18T10:00:00.000Z",
    disposition: "current",
    id: `slug_${sourceId}`,
    kind: "product",
    market: "cz",
    normalizationVersion: 1,
    normalizedSlug: slug,
    routeId: `route_${sourceId}`,
  },
  projectionType: "entity",
  route: {
    createdAt: "2026-08-18T10:00:00.000Z",
    equivalenceKey: `product:${sourceId}`,
    id: `route_${sourceId}`,
    indexPolicy,
    kind: "product",
    market: "cz",
    sourceId,
    sourceSystem: "medusa",
    sourceType: "product",
    staticRouteKey: null,
    status: "active",
    successorRouteId: null,
    targetType: "entity",
    updatedAt: "2026-08-18T10:00:00.000Z",
    version: 1,
  },
})

const dependencies = (
  entities: readonly ActiveEntityRouteTarget[]
): SitemapDataDependencies => ({
  listEntities: vi.fn().mockResolvedValue({ kind: "found", value: entities }),
  listStatic: vi.fn().mockResolvedValue({ kind: "found", value: [] }),
  validateEntitySources: vi.fn().mockImplementation(({ sources }) =>
    Promise.resolve({
      kind: "found",
      value: sources.map((source: { routeId: string }) => ({
        routeId: source.routeId,
        updatedAt: "2026-08-19T11:00:00.000Z",
      })),
    })
  ),
  validateStaticSources: vi.fn().mockImplementation(({ sources }) =>
    Promise.resolve({
      kind: "found",
      value: sources.map((source: { routeId: string }) => ({
        routeId: source.routeId,
      })),
    })
  ),
})

describe("system sitemaps", () => {
  it("parses only known one-based shard names", () => {
    expect(parseSitemapShardName("product-1.xml")).toEqual({
      kind: "product",
      shard: 1,
    })
    expect(parseSitemapShardName("product-0.xml")).toBeNull()
    expect(parseSitemapShardName("campaign-1.xml")).toBeNull()
    expect(parseSitemapShardName("unknown-1.xml")).toBeNull()
    expect(parseSitemapShardName("product-1.xml/extra")).toBeNull()
  })

  it("builds product URLs only from URLR slugs and verifies stable source IDs", async () => {
    const deps = dependencies([
      projection("prod_1", "public-slug"),
      projection("prod_hidden", "hidden", "noindex"),
    ])
    const result = await listSitemapEntries(binding, "product", deps)
    expect(result).toEqual({
      kind: "found",
      value: [
        {
          lastModified: "2026-08-19T11:00:00.000Z",
          location: "https://herbatica.cz/produkty/public-slug",
        },
      ],
    })
    expect(deps.validateEntitySources).toHaveBeenCalledWith({
      kind: "product",
      market: "cz",
      sources: [
        {
          publicSlug: "public-slug",
          routeId: "route_prod_1",
          sourceId: "prod_1",
        },
      ],
    })
  })

  it("fails the whole product shard when an active source is missing", async () => {
    const deps = dependencies([projection("prod_missing", "missing")])
    vi.mocked(deps.validateEntitySources).mockResolvedValue({
      causeCode: "ACTIVE_PRODUCT_SOURCE_MISSING",
      kind: "invalid-response",
    })
    await expect(listSitemapEntries(binding, "product", deps)).resolves.toEqual(
      {
        causeCode: "ACTIVE_PRODUCT_SOURCE_MISSING",
        kind: "invalid-response",
      }
    )
  })

  it("builds hierarchical static paths and rejects broken parents", async () => {
    const parent = {
      currentPath: {
        createdAt: "2026-08-18T10:00:00.000Z",
        disposition: "current",
        id: "path_parent",
        introducedInVersion: 1,
        market: "cz",
        matchMode: "exact",
        parentRouteKey: null,
        routeKey: "parent",
        segment: "informace",
      },
      pathHistory: [],
      projectionType: "static",
      route: {
        createdAt: "2026-08-18T10:00:00.000Z",
        equivalenceKey: null,
        id: "route_parent",
        indexPolicy: "indexable",
        kind: "static",
        market: "cz",
        sourceId: null,
        sourceSystem: null,
        sourceType: null,
        staticRouteKey: "parent",
        status: "active",
        successorRouteId: null,
        targetType: "static",
        updatedAt: "2026-08-18T10:00:00.000Z",
        version: 1,
      },
    } as const satisfies StaticRouteSnapshot
    const child = {
      ...parent,
      currentPath: {
        ...parent.currentPath,
        id: "path_child",
        parentRouteKey: "parent",
        routeKey: "child",
        segment: "kontakt",
      },
      route: {
        ...parent.route,
        id: "route_child",
        staticRouteKey: "child",
      },
    } as const satisfies StaticRouteSnapshot
    const deps = dependencies([])
    vi.mocked(deps.listStatic).mockResolvedValue({
      kind: "found",
      value: [parent, child],
    })
    const result = await listSitemapEntries(binding, "static", deps)
    expect(result.kind).toBe("found")
    if (result.kind === "found") {
      expect(result.value.map((entry) => entry.location)).toEqual([
        "https://herbatica.cz/informace",
        "https://herbatica.cz/informace/kontakt",
      ])
    }
  })

  it("uses one deterministic core shard", async () => {
    const result = await listSitemapEntries(binding, "core", dependencies([]))
    expect(result).toEqual({
      kind: "found",
      value: [
        { location: "https://herbatica.cz/" },
        { location: "https://herbatica.cz/produkty" },
        { location: "https://herbatica.cz/kategorie" },
        { location: "https://herbatica.cz/znacky" },
        { location: "https://herbatica.cz/kolekce" },
        { location: "https://herbatica.cz/poradna" },
      ],
    })
    expect(
      result.kind === "found" && shardSitemapEntries(result.value)
    ).toHaveLength(1)
  })
})
