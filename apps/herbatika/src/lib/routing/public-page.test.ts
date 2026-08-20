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
    bindings: {},
    marketByHost: {},
  })),
  getHerbatikaMarketContext: vi.fn(() => ({ locale: "sk-SK" })),
  getRegionServerContext: vi.fn(async () => ({ region: null })),
  getUrlRegistryRuntime: vi.fn(),
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
  getConfiguredMarketRuntime: mocks.getConfiguredMarketRuntime,
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: mocks.getUrlRegistryRuntime,
}))

import { resolveEntityPublicPage } from "./public-page"

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
        resolve: mocks.resolveRegistryRoute,
      },
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
      sourceId: expectedSourceId,
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
      sourceId: "category-successor",
    })
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
  ])("fails the current page closed when an equivalent source is $kind", async (alternateFailure) => {
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
      props: { page: { kind: "error", status: 503 } },
    })
    expect(requestContext.res.statusCode).toBe(503)
  })
})
