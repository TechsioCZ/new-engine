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
import {
  listSitemapEntries,
  listSitemapShardEntries,
  shardSitemapEntries,
} from "./sitemaps"

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
  indexPolicy: "indexable" | "noindex" = "indexable",
  market: "cz" | "sk" = "cz"
): ActiveEntityRouteTarget => ({
  currentSlug: {
    createdAt: "2026-08-18T10:00:00.000Z",
    disposition: "current",
    id: `slug_${sourceId}`,
    kind: "product",
    market,
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
    market,
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

const campaignProjection = (
  sourceId: string,
  slug: string
): ActiveEntityRouteTarget => {
  const target = projection(sourceId, slug)
  return {
    ...target,
    currentSlug: { ...target.currentSlug, kind: "campaign" },
    route: {
      ...target.route,
      equivalenceKey: `campaign:${sourceId}`,
      kind: "campaign",
      sourceType: "campaign",
    },
  }
}

const dependencies = (
  entities: readonly ActiveEntityRouteTarget[]
): SitemapDataDependencies => ({
  countEntities: vi.fn().mockResolvedValue({
    kind: "found",
    value: entities.filter((entity) => entity.route.indexPolicy === "indexable")
      .length,
  }),
  listEntities: vi.fn().mockImplementation(({ limit, offset }) =>
    Promise.resolve({
      kind: "found",
      value: entities
        .filter((entity) => entity.route.indexPolicy === "indexable")
        .slice(offset, offset + limit),
    })
  ),
  listStatic: vi.fn().mockResolvedValue({ kind: "found", value: [] }),
  readEntitySourceVersions: vi.fn().mockImplementation((projections) =>
    Promise.resolve({
      kind: "found",
      value: projections.map((item: ActiveEntityRouteTarget) => ({
        routeId: item.route.id,
        sourceVersion: `source-${item.route.id}`,
      })),
    })
  ),
  validateHomepageSource: vi.fn().mockResolvedValue({
    kind: "found",
    value: true,
  }),
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
    expect(parseSitemapShardName("campaign-1.xml")).toEqual({
      kind: "campaign",
      shard: 1,
    })
    expect(parseSitemapShardName("unknown-1.xml")).toBeNull()
    expect(parseSitemapShardName("product-1.xml/extra")).toBeNull()
  })

  it("emits campaign URLs only after exact publication-source validation", async () => {
    const deps = dependencies([campaignProjection("campaign_1", "letni-akce")])

    const result = await listSitemapEntries(binding, "campaign", deps)

    expect(result).toEqual({
      kind: "found",
      value: [
        {
          alternates: {
            "cs-CZ": "https://herbatica.cz/akce/letni-akce",
          },
          lastModified: "2026-08-19T11:00:00.000Z",
          location: "https://herbatica.cz/akce/letni-akce",
        },
      ],
    })
    expect(deps.validateEntitySources).toHaveBeenCalledWith({
      kind: "campaign",
      market: "cz",
      sources: [
        {
          publicSlug: "letni-akce",
          routeId: "route_campaign_1",
          sourceId: "campaign_1",
          sourceVersion: "source-route_campaign_1",
        },
      ],
    })
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
          alternates: {
            "cs-CZ": "https://herbatica.cz/produkty/public-slug",
          },
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
          sourceVersion: "source-route_prod_1",
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

  it("emits source-validated reciprocal entity alternates", async () => {
    const current = projection("prod_1", "cesky-produkt")
    const skProjection = projection(
      "prod_1_sk",
      "slovensky-produkt",
      "indexable",
      "sk"
    )
    const equivalent = {
      ...skProjection,
      route: { ...skProjection.route, equivalenceKey: "product:prod_1" },
    } satisfies ActiveEntityRouteTarget
    const deps = {
      ...dependencies([current]),
      findEntityEquivalents: vi
        .fn()
        .mockResolvedValue({ kind: "found", value: [equivalent] }),
    } satisfies SitemapDataDependencies

    const result = await listSitemapEntries(binding, "product", deps)

    expect(result.kind === "found" && result.value[0]?.alternates).toEqual({
      "cs-CZ": "https://herbatica.cz/produkty/cesky-produkt",
      "sk-SK": "https://herbatica.sk/produkty/slovensky-produkt",
    })
    expect(deps.validateEntitySources).toHaveBeenCalledWith({
      kind: "product",
      market: "sk",
      sources: [
        {
          publicSlug: "slovensky-produkt",
          routeId: "route_prod_1_sk",
          sourceId: "prod_1_sk",
          sourceVersion: "source-route_prod_1_sk",
        },
      ],
    })
  })

  it("loads and validates only the requested bounded product shard", async () => {
    const deps = dependencies(
      Array.from({ length: 205 }, (_, index) =>
        projection(`prod_${index}`, `product-${index}`)
      )
    )

    const result = await listSitemapShardEntries(binding, "product", 2, deps)

    expect(result.kind).toBe("found")
    if (result.kind === "found") {
      expect(result.value).toHaveLength(100)
      expect(result.value[0]?.location).toBe(
        "https://herbatica.cz/produkty/product-100"
      )
    }
    expect(deps.listEntities).toHaveBeenCalledTimes(1)
    expect(deps.countEntities).toHaveBeenCalledTimes(1)
    expect(deps.listEntities).toHaveBeenCalledWith({
      kind: "product",
      limit: 100,
      market: "cz",
      offset: 100,
    })
    expect(deps.validateEntitySources).toHaveBeenCalledTimes(1)
    expect(
      vi.mocked(deps.validateEntitySources).mock.calls[0]?.[0].sources
    ).toHaveLength(100)
  })

  it("serves an advertised shard as an empty urlset when every source is filtered", async () => {
    const deps = dependencies([projection("prod_stale", "stale-slug")])
    vi.mocked(deps.validateEntitySources).mockResolvedValue({
      kind: "found",
      value: [],
    })

    await expect(
      listSitemapShardEntries(binding, "product", 1, deps)
    ).resolves.toEqual({ kind: "found", value: [] })
    await expect(
      listSitemapShardEntries(binding, "product", 2, deps)
    ).resolves.toEqual({ kind: "missing" })
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
        {
          alternates: { "cs-CZ": "https://herbatica.cz/" },
          location: "https://herbatica.cz/",
        },
        {
          alternates: { "cs-CZ": "https://herbatica.cz/produkty" },
          location: "https://herbatica.cz/produkty",
        },
        {
          alternates: { "cs-CZ": "https://herbatica.cz/kategorie" },
          location: "https://herbatica.cz/kategorie",
        },
        {
          alternates: { "cs-CZ": "https://herbatica.cz/znacky" },
          location: "https://herbatica.cz/znacky",
        },
        {
          alternates: { "cs-CZ": "https://herbatica.cz/kolekce" },
          location: "https://herbatica.cz/kolekce",
        },
        {
          alternates: { "cs-CZ": "https://herbatica.cz/poradna" },
          location: "https://herbatica.cz/poradna",
        },
      ],
    })
    expect(
      result.kind === "found" && shardSitemapEntries(result.value)
    ).toHaveLength(1)
  })

  it("uses canonical origins for all enabled-market core alternates", async () => {
    const deps = {
      ...dependencies([]),
      listMarkets: vi.fn().mockReturnValue(["sk", "cz", "hu", "ro"]),
    } satisfies SitemapDataDependencies

    const result = await listSitemapEntries(binding, "core", deps)

    expect(result.kind === "found" && result.value[0]?.alternates).toEqual({
      "cs-CZ": "https://herbatica.cz/",
      "hu-HU": "https://herbatica.hu/",
      "ro-RO": "https://herbatica.ro/",
      "sk-SK": "https://herbatica.sk/",
    })
  })

  it("omits unavailable homepages and their hreflang alternates reciprocally", async () => {
    const readyMarkets = new Set(["sk", "cz", "hu"])
    const deps = {
      ...dependencies([]),
      listMarkets: vi.fn().mockReturnValue(["sk", "cz", "hu", "ro"]),
      validateHomepageSource: vi.fn((market: "sk" | "cz" | "hu" | "ro") =>
        Promise.resolve(
          readyMarkets.has(market)
            ? ({ kind: "found", value: true } as const)
            : ({ kind: "unavailable" } as const)
        )
      ),
    } satisfies SitemapDataDependencies

    const czResult = await listSitemapEntries(binding, "core", deps)
    const roResult = await listSitemapEntries(
      {
        ...binding,
        acceptedHosts: ["herbatica.ro"],
        canonicalOrigin: "https://herbatica.ro",
        countryCode: "RO",
        locale: "ro-RO",
        market: "ro",
        publishableApiKey: "pk_ro",
        publishableApiKeyId: "pkid_ro",
        regionId: "reg_ro",
        salesChannelId: "sc_ro",
      },
      "core",
      deps
    )

    expect(czResult.kind === "found" && czResult.value[0]).toEqual({
      alternates: {
        "cs-CZ": "https://herbatica.cz/",
        "hu-HU": "https://herbatica.hu/",
        "sk-SK": "https://herbatica.sk/",
      },
      location: "https://herbatica.cz/",
    })
    expect(
      roResult.kind === "found" &&
        roResult.value.some(
          ({ location }) => location === "https://herbatica.ro/"
        )
    ).toBe(false)
    expect(
      roResult.kind === "found" &&
        roResult.value.some(
          ({ location }) => location === "https://herbatica.ro/produse"
        )
    ).toBe(true)
  })
})
