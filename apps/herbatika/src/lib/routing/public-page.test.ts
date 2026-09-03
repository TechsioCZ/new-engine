import type { GetServerSidePropsContext } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  EntityUrlRoute,
  SourceReadResult,
  UrlEntitySlug,
  UrlRegistryResolution,
} from "@/lib/url-registry/contracts"

const mocks = vi.hoisted(() => ({
  fetchCmsFooterNavigation: vi.fn(async () => ({ columns: [] })),
  fetchExternalReviewTrustSources: vi.fn(async () => []),
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
  findActiveEquivalents: vi.fn(),
  getConfiguredMarketRuntime: vi.fn(() => ({
    allowedMarkets: ["sk", "cz"],
    bindings: {
      cz: {
        acceptedHosts: ["herbatica.cz"],
        canonicalOrigin: "https://herbatica.cz",
        market: "cz",
      },
      sk: {
        acceptedHosts: ["herbatica.sk"],
        canonicalOrigin: "https://herbatica.sk",
        market: "sk",
      },
    },
    marketByHost: {
      "herbatica.cz": "cz",
      "herbatica.sk": "sk",
    },
  })),
  getHerbatikaMarketContext: vi.fn(() => ({ locale: "sk-SK" })),
  getRegionServerContext: vi.fn(async () => ({ region: null })),
  getUrlRegistryRuntime: vi.fn(),
  listAuditRecords: vi.fn(),
  readRequiredPublicEntitySlugs: vi.fn(async () => ({
    kind: "found" as const,
    value: {},
  })),
  resolveRegistryRoute: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/storefront/cms-footer-navigation", () => ({
  fetchCmsFooterNavigation: mocks.fetchCmsFooterNavigation,
}))
vi.mock("@/lib/storefront/external-reviews.server", () => ({
  fetchExternalReviewTrustSources: mocks.fetchExternalReviewTrustSources,
}))
vi.mock("@/lib/storefront/market-context", () => ({
  getHerbatikaMarketContext: mocks.getHerbatikaMarketContext,
}))
vi.mock("@/lib/storefront/ssr/context", () => ({
  getRegionServerContext: mocks.getRegionServerContext,
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
}))
vi.mock("@/lib/storefront/storefront-texts.server", () => ({
  fetchStorefrontTextMessages: mocks.fetchStorefrontTextMessages,
}))
vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRoutingRuntime: mocks.getConfiguredMarketRuntime,
  getConfiguredMarketRuntime: mocks.getConfiguredMarketRuntime,
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: mocks.getUrlRegistryRuntime,
}))

import { loadEntityAlternates, resolveEntityPublicPage } from "./public-page"

const timestamp = "2026-08-19T00:00:00.000Z"

const route = (
  sourceId: string,
  overrides: Partial<EntityUrlRoute> = {}
): EntityUrlRoute => ({
  id: `route-${sourceId}`,
  market: "sk",
  kind: "category",
  targetType: "entity",
  sourceSystem: "medusa",
  sourceType: "category",
  sourceId,
  staticRouteKey: null,
  equivalenceKey: `category:${sourceId}`,
  indexPolicy: "indexable",
  status: "active",
  successorRouteId: null,
  version: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
})

const slug = (
  normalizedSlug: string,
  targetRoute: EntityUrlRoute,
  disposition: UrlEntitySlug["disposition"] = "current"
): UrlEntitySlug => ({
  id: `slug-${targetRoute.market}-${normalizedSlug}`,
  market: targetRoute.market,
  kind: targetRoute.kind,
  normalizedSlug,
  routeId: targetRoute.id,
  disposition,
  normalizationVersion: 1,
  createdAt: timestamp,
})

const currentResolution = (): UrlRegistryResolution => {
  const currentRoute = route("category-current")
  const currentSlug = slug("current-category", currentRoute)
  return {
    disposition: "current",
    route: currentRoute,
    matchedSlug: currentSlug,
    currentSlug,
  }
}

const audit = (targetRoute: EntityUrlRoute) => ({
  resultVersion: targetRoute.version,
  routeId: targetRoute.id,
  source: {
    sourceId: targetRoute.sourceId,
    sourceSystem: targetRoute.sourceSystem,
    sourceType: targetRoute.sourceType,
    sourceVersion:
      targetRoute.kind === "product" ? "2026-08-21T10:00:00.000Z" : "7",
  },
})

const auditedRoutes = () => [
  route("category-current"),
  route("category-successor"),
  route("category-cz", { market: "cz" }),
  route("product-sk", {
    equivalenceKey: "product:shared",
    kind: "product",
    sourceType: "product",
  }),
  route("product-cz", {
    equivalenceKey: "product:shared",
    kind: "product",
    market: "cz",
    sourceType: "product",
  }),
  route("collection-sk", {
    equivalenceKey: "collection:shared",
    kind: "collection",
    sourceType: "collection",
  }),
  route("collection-cz", {
    equivalenceKey: "collection:shared",
    kind: "collection",
    market: "cz",
    sourceType: "collection",
  }),
]

const aliasResolution = (): UrlRegistryResolution => {
  const currentRoute = route("category-current")
  return {
    disposition: "alias",
    route: currentRoute,
    matchedSlug: slug("old-category", currentRoute, "alias"),
    currentSlug: slug("current-category", currentRoute),
  }
}

const supersededResolution = (): UrlRegistryResolution => {
  const successorRoute = route("category-successor")
  const supersededRoute = route("category-retired", {
    status: "superseded",
    successorRouteId: successorRoute.id,
  })
  return {
    disposition: "superseded",
    route: supersededRoute,
    matchedSlug: slug("retired-category", supersededRoute),
    successorRoute,
    currentSlug: slug("successor-category", successorRoute),
  }
}

const context = ({
  canonicalizationRequired = false,
  slug: slugParam = "current-category",
  url = `/~sf/sk/category/${slugParam}`,
}: Readonly<{
  canonicalizationRequired?: boolean
  slug?: string
  url?: string
}> = {}) =>
  ({
    params: { market: "sk", slug: slugParam },
    req: {
      headers: {
        "x-sf-canonical-origin": "https://herbatica.sk",
        "x-sf-canonicalization-required": canonicalizationRequired
          ? "1"
          : undefined,
        "x-sf-market": "sk",
        "x-sf-public-path": `/category/${slugParam}`,
        "x-sf-route-key": "category.detail",
      },
      url,
    },
    res: {
      setHeader: vi.fn(),
      statusCode: 200,
    },
  }) as unknown as GetServerSidePropsContext

const resolve = (
  requestContext: GetServerSidePropsContext,
  loadSource: (
    input: Readonly<{ market: "sk" | "cz" | "hu" | "ro"; sourceId: string }>
  ) => Promise<SourceReadResult<Readonly<{ title: string }>>>
) =>
  resolveEntityPublicPage(requestContext, {
    expectedRouteKey: "category.detail",
    kind: "category",
    loadSource,
    queryKind: "category-detail",
  })

const redirectCases = [
  {
    expectedSourceId: "category-current",
    label: "alias",
    request: () => context({ slug: "old-category" }),
    resolution: aliasResolution,
  },
  {
    expectedSourceId: "category-successor",
    label: "superseded route",
    request: () => context({ slug: "retired-category" }),
    resolution: supersededResolution,
  },
  {
    expectedSourceId: "category-current",
    label: "slug case",
    request: () => context({ slug: "Current-Category" }),
    resolution: currentResolution,
  },
  {
    expectedSourceId: "category-current",
    label: "slash canonicalization",
    request: () => context({ canonicalizationRequired: true }),
    resolution: currentResolution,
  },
  {
    expectedSourceId: "category-current",
    label: "query canonicalization",
    request: () =>
      context({ url: "/~sf/sk/category/current-category?unknown=1" }),
    resolution: currentResolution,
  },
] as const

describe("resolveEntityPublicPage authoritative source ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUrlRegistryRuntime.mockResolvedValue({
      enabled: true,
      registry: {
        findActiveEquivalents: mocks.findActiveEquivalents,
        listAuditRecords: mocks.listAuditRecords,
        resolve: mocks.resolveRegistryRoute,
      },
    })
    mocks.listAuditRecords.mockResolvedValue({
      kind: "found",
      value: { items: auditedRoutes().map(audit), nextCursor: null },
    })
    mocks.findActiveEquivalents.mockResolvedValue({
      kind: "found",
      value: [],
    })
  })

  it.each(
    redirectCases
  )("returns 404 instead of redirecting a missing source for $label", async ({
    expectedSourceId,
    request,
    resolution,
  }) => {
    mocks.resolveRegistryRoute.mockResolvedValue({
      kind: "found",
      value: resolution(),
    })
    const loadSource = vi.fn(async () => ({ kind: "missing" as const }))

    const result = await resolve(request(), loadSource)

    expect(result).toEqual({ notFound: true })
    expect(loadSource).toHaveBeenCalledWith({
      market: "sk",
      publicSlug:
        expectedSourceId === "category-successor"
          ? "successor-category"
          : "current-category",
      sourceId: expectedSourceId,
      sourceVersion: "1",
    })
  })

  it.each([
    { kind: "unavailable" as const, retryAfterSeconds: 17 },
    { causeCode: "malformed-source", kind: "invalid-response" as const },
  ])("returns 503 before an alias redirect for $kind", async (sourceFailure) => {
    mocks.resolveRegistryRoute.mockResolvedValue({
      kind: "found",
      value: aliasResolution(),
    })
    const loadSource = vi.fn(async () => sourceFailure)
    const requestContext = context({ slug: "old-category" })

    const result = await resolve(requestContext, loadSource)

    expect(result).toMatchObject({
      props: { page: { kind: "error", status: 503 } },
    })
    expect(requestContext.res.statusCode).toBe(503)
  })

  it("keeps a rejected current entity source strict", async () => {
    mocks.resolveRegistryRoute.mockResolvedValue({
      kind: "found",
      value: currentResolution(),
    })
    const requestContext = context()

    const result = await resolve(
      requestContext,
      vi.fn(() => Promise.reject(new Error("SK source transport failed")))
    )

    expect(result).toMatchObject({
      props: { page: { kind: "error", status: 503 } },
    })
    expect(requestContext.res.statusCode).toBe(503)
  })

  it("redirects only after the authoritative source is found", async () => {
    mocks.resolveRegistryRoute.mockResolvedValue({
      kind: "found",
      value: supersededResolution(),
    })
    const loadSource = vi.fn(async () => ({
      kind: "found" as const,
      value: { title: "Successor" },
    }))

    const result = await resolve(
      context({ slug: "retired-category" }),
      loadSource
    )

    expect(result).toMatchObject({
      redirect: {
        destination: "https://herbatica.sk/kategorie/successor-category",
        statusCode: 308,
      },
    })
    expect(loadSource).toHaveBeenCalledWith({
      market: "sk",
      publicSlug: "successor-category",
      sourceId: "category-successor",
      sourceVersion: "1",
    })
  })

  it("serves the current entity page without a registry audit proof", async () => {
    mocks.resolveRegistryRoute.mockResolvedValue({
      kind: "found",
      value: currentResolution(),
    })
    mocks.listAuditRecords.mockResolvedValue({
      kind: "found",
      value: { items: [], nextCursor: null },
    })
    const loadSource = vi.fn(async () => ({
      kind: "found" as const,
      value: { title: "Category" },
    }))
    const requestContext = context()

    const result = await resolve(requestContext, loadSource)

    expect(result).toMatchObject({
      props: {
        page: { kind: "found", value: { title: "Category" } },
        seo: { robots: "index, follow" },
      },
    })
    expect(requestContext.res.statusCode).toBe(200)
  })

  it("omits a missing equivalent-market source from alternates", async () => {
    const resolution = currentResolution()
    const czRoute = route("category-cz", { market: "cz" })
    const czTarget = {
      projectionType: "entity" as const,
      route: czRoute,
      currentSlug: slug("ceska-kategorie", czRoute),
    }
    mocks.resolveRegistryRoute.mockResolvedValue({
      kind: "found",
      value: resolution,
    })
    mocks.findActiveEquivalents.mockResolvedValue({
      kind: "found",
      value: [czTarget],
    })
    const loadSource = vi.fn(async ({ market }: { market: string }) =>
      market === "sk"
        ? { kind: "found" as const, value: { title: "Category" } }
        : { kind: "missing" as const }
    )

    const result = await resolve(context(), loadSource)

    expect(result).toMatchObject({
      props: { seo: { alternates: { "sk-SK": expect.any(String) } } },
    })
    expect(
      (result as { props: { seo: { alternates: object } } }).props.seo
        .alternates
    ).not.toHaveProperty("cs-CZ")
  })

  it.each([
    { kind: "unavailable" as const, retryAfterSeconds: 23 },
    { causeCode: "malformed-alternate", kind: "invalid-response" as const },
  ])("omits an equivalent category whose source is $kind", async (alternateFailure) => {
    const resolution = currentResolution()
    const czRoute = route("category-cz", { market: "cz" })
    mocks.resolveRegistryRoute.mockResolvedValue({
      kind: "found",
      value: resolution,
    })
    mocks.findActiveEquivalents.mockResolvedValue({
      kind: "found",
      value: [
        {
          projectionType: "entity",
          route: czRoute,
          currentSlug: slug("ceska-kategorie", czRoute),
        },
      ],
    })
    const loadSource = vi.fn(async ({ market }: { market: string }) =>
      market === "sk"
        ? { kind: "found" as const, value: { title: "Category" } }
        : alternateFailure
    )
    const requestContext = context()

    const result = await resolve(requestContext, loadSource)

    expect(result).toMatchObject({
      props: {
        page: { kind: "found", value: { title: "Category" } },
        seo: { alternates: { "sk-SK": expect.any(String) } },
      },
    })
    expect(
      (result as { props: { seo: { alternates: object } } }).props.seo
        .alternates
    ).not.toHaveProperty("cs-CZ")
    expect(requestContext.res.statusCode).toBe(200)
  })

  it("omits a rejected equivalent category source", async () => {
    const resolution = currentResolution()
    const czRoute = route("category-cz", { market: "cz" })
    mocks.resolveRegistryRoute.mockResolvedValue({
      kind: "found",
      value: resolution,
    })
    mocks.findActiveEquivalents.mockResolvedValue({
      kind: "found",
      value: [
        {
          projectionType: "entity",
          route: czRoute,
          currentSlug: slug("ceska-kategorie", czRoute),
        },
      ],
    })
    const loadSource = vi.fn(({ market }: { market: string }) =>
      market === "sk"
        ? Promise.resolve({
            kind: "found" as const,
            value: { title: "Category" },
          })
        : Promise.reject(new Error("CZ source transport failed"))
    )

    const result = await resolve(context(), loadSource)

    expect(result).toMatchObject({
      props: {
        page: { kind: "found", value: { title: "Category" } },
        seo: { alternates: { "sk-SK": expect.any(String) } },
      },
    })
  })

  it.each([
    { kind: "unavailable" as const, retryAfterSeconds: 23 },
    { causeCode: "malformed-alternate", kind: "invalid-response" as const },
  ])("omits an equivalent product whose source is $kind", async (alternateFailure) => {
    const skRoute = route("product-sk", {
      equivalenceKey: "product:shared",
      kind: "product",
      sourceType: "product",
    })
    const czRoute = route("product-cz", {
      equivalenceKey: "product:shared",
      kind: "product",
      market: "cz",
      sourceType: "product",
    })
    mocks.findActiveEquivalents.mockResolvedValue({
      kind: "found",
      value: [
        {
          projectionType: "entity",
          route: czRoute,
          currentSlug: slug("cesky-produkt", czRoute),
        },
      ],
    })
    const loadSource = vi.fn(async () => alternateFailure)

    const result = await loadEntityAlternates(
      {
        projectionType: "entity",
        route: skRoute,
        currentSlug: slug("slovensky-produkt", skRoute),
      },
      loadSource
    )

    expect(result).toEqual({
      "sk-SK": "https://herbatica.sk/produkty/slovensky-produkt",
    })
    expect(loadSource).toHaveBeenCalledOnce()
    expect(loadSource).toHaveBeenCalledWith({
      market: "cz",
      publicSlug: "cesky-produkt",
      sourceId: "product-cz",
      sourceVersion: "2026-08-21T10:00:00.000Z",
    })
  })

  it("omits a product alternate whose current sourceVersion has no exact URLR audit", async () => {
    const skRoute = route("product-sk", {
      equivalenceKey: "product:shared",
      kind: "product",
      sourceType: "product",
    })
    const czRoute = route("product-cz", {
      equivalenceKey: "product:shared",
      kind: "product",
      market: "cz",
      sourceType: "product",
    })
    mocks.findActiveEquivalents.mockResolvedValue({
      kind: "found",
      value: [
        {
          projectionType: "entity",
          route: czRoute,
          currentSlug: slug("cesky-produkt", czRoute),
        },
      ],
    })
    mocks.listAuditRecords.mockResolvedValue({
      kind: "found",
      value: {
        items: [{ ...audit(czRoute), resultVersion: 0 }],
        nextCursor: null,
      },
    })
    const loadSource = vi.fn()

    await expect(
      loadEntityAlternates(
        {
          projectionType: "entity",
          route: skRoute,
          currentSlug: slug("slovensky-produkt", skRoute),
        },
        loadSource
      )
    ).resolves.toEqual({
      "sk-SK": "https://herbatica.sk/produkty/slovensky-produkt",
    })
    expect(loadSource).not.toHaveBeenCalled()
  })

  it.each([
    {
      label: "is not indexable",
      predicate: (value: Readonly<{ catalog: { count: number } }>) =>
        value.catalog.count > 0,
    },
    {
      label: "indexability check throws",
      predicate: () => {
        throw new Error("Malformed collection projection")
      },
    },
  ])("omits a found collection alternate when it $label", async ({
    predicate,
  }) => {
    const skRoute = route("collection-sk", {
      equivalenceKey: "collection:shared",
      kind: "collection",
      sourceType: "collection",
    })
    const czRoute = route("collection-cz", {
      equivalenceKey: "collection:shared",
      kind: "collection",
      market: "cz",
      sourceType: "collection",
    })
    mocks.findActiveEquivalents.mockResolvedValue({
      kind: "found",
      value: [
        {
          projectionType: "entity",
          route: czRoute,
          currentSlug: slug("ceska-kolekce", czRoute),
        },
      ],
    })

    const result = await loadEntityAlternates(
      {
        projectionType: "entity",
        route: skRoute,
        currentSlug: slug("slovenska-kolekcia", skRoute),
      },
      vi.fn(() =>
        Promise.resolve({
          kind: "found" as const,
          value: { catalog: { count: 0 } },
        })
      ),
      predicate
    )

    expect(result).toEqual({
      "sk-SK": expect.stringContaining("slovenska-kolekcia"),
    })
  })

  it.each([
    { kind: "unavailable" as const, retryAfterSeconds: 23 },
    { causeCode: "malformed-equivalents", kind: "invalid-response" as const },
  ])("keeps self when equivalent route discovery is $kind", async (equivalentFailure) => {
    const currentRoute = route("category-current")
    mocks.findActiveEquivalents.mockResolvedValue(equivalentFailure)
    const loadSource = vi.fn()

    const result = await loadEntityAlternates(
      {
        projectionType: "entity",
        route: currentRoute,
        currentSlug: slug("current-category", currentRoute),
      },
      loadSource
    )

    expect(result).toEqual({
      "sk-SK": "https://herbatica.sk/kategorie/current-category",
    })
    expect(loadSource).not.toHaveBeenCalled()
  })

  it("keeps self when equivalent route discovery rejects", async () => {
    const currentRoute = route("category-current")
    mocks.findActiveEquivalents.mockRejectedValue(
      new Error("URLR equivalence read failed")
    )

    const result = await loadEntityAlternates(
      {
        projectionType: "entity",
        route: currentRoute,
        currentSlug: slug("current-category", currentRoute),
      },
      vi.fn()
    )

    expect(result).toEqual({
      "sk-SK": "https://herbatica.sk/kategorie/current-category",
    })
  })

  it("omits malformed, non-indexable, current-market, and ambiguous equivalents", async () => {
    const currentRoute = route("category-current")
    const noindexRoute = route("category-noindex", {
      indexPolicy: "noindex",
      market: "cz",
    })
    const wrongEquivalenceRoute = route("category-wrong-equivalence", {
      equivalenceKey: "category:other",
      market: "cz",
    })
    const malformedSlugRoute = route("category-malformed-slug", {
      market: "cz",
    })
    const currentMarketDuplicate = route("category-other-sk")
    const duplicateOne = route("category-duplicate-one", { market: "cz" })
    const duplicateTwo = route("category-duplicate-two", { market: "cz" })
    mocks.findActiveEquivalents.mockResolvedValue({
      kind: "found",
      value: [
        {
          projectionType: "entity",
          route: noindexRoute,
          currentSlug: slug("noindex", noindexRoute),
        },
        {
          projectionType: "entity",
          route: wrongEquivalenceRoute,
          currentSlug: slug("wrong-equivalence", wrongEquivalenceRoute),
        },
        {
          projectionType: "entity",
          route: malformedSlugRoute,
          currentSlug: slug("MALFORMED", malformedSlugRoute),
        },
        {
          projectionType: "entity",
          route: currentMarketDuplicate,
          currentSlug: slug("other-sk", currentMarketDuplicate),
        },
        {
          projectionType: "entity",
          route: duplicateOne,
          currentSlug: slug("duplicate-one", duplicateOne),
        },
        {
          projectionType: "entity",
          route: duplicateTwo,
          currentSlug: slug("duplicate-two", duplicateTwo),
        },
      ],
    })
    const loadSource = vi.fn()

    const result = await loadEntityAlternates(
      {
        projectionType: "entity",
        route: currentRoute,
        currentSlug: slug("current-category", currentRoute),
      },
      loadSource
    )

    expect(result).toEqual({
      "sk-SK": "https://herbatica.sk/kategorie/current-category",
    })
    expect(loadSource).not.toHaveBeenCalled()
  })
})
