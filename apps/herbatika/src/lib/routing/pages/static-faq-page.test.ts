import type { GetServerSidePropsContext } from "next"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchCmsFooterNavigation: vi.fn(async () => ({ columns: [] })),
  fetchExternalReviewTrustSources: vi.fn(async () => []),
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
  getHerbatikaMarketContext: vi.fn((market: "cz" | "hu" | "ro" | "sk") => {
    const localeByMarket = {
      cz: "cs-CZ",
      hu: "hu-HU",
      ro: "ro-RO",
      sk: "sk-SK",
    } as const
    return { code: market, locale: localeByMarket[market] }
  }),
  getRegionServerContext: vi.fn(async () => ({ region: null })),
  readRequiredPublicEntitySlugs: vi.fn(async () => ({
    kind: "found",
    value: {},
  })),
}))

vi.mock("@/components/cms/cms-page-surface", () => ({
  CmsPageSurface: vi.fn(),
}))
vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRoutingRuntime: vi.fn(() => ({
    allowedMarkets: ["sk", "cz", "hu", "ro"],
    bindings: {
      cz: {
        acceptedHosts: ["herbatica.cz"],
        canonicalOrigin: "https://herbatica.cz",
        market: "cz",
      },
      ro: {
        acceptedHosts: ["herbatica.ro"],
        canonicalOrigin: "https://herbatica.ro",
        market: "ro",
      },
      hu: {
        acceptedHosts: ["herbatica.hu"],
        canonicalOrigin: "https://herbatica.hu",
        market: "hu",
      },
      sk: {
        acceptedHosts: ["herbatica.sk"],
        canonicalOrigin: "https://herbatica.sk",
        market: "sk",
      },
    },
    marketByHost: {
      "herbatica.cz": "cz",
      "herbatica.hu": "hu",
      "herbatica.ro": "ro",
      "herbatica.sk": "sk",
    },
  })),
}))
vi.mock("@/lib/storefront/cms", () => ({
  readCmsStaticPageWithDemoFallback: vi.fn(),
}))
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
vi.mock("@/lib/url/segment-registry-publication.server", () => ({
  loadStaticRoutePublicationDecision: vi.fn(async () => ({
    evidence: {
      editorialApprovalReference: "CZ-EDITORIAL-test",
      frozenRegistrySha256: "f".repeat(64),
      legalApprovalReference: "CZ-LEGAL-test",
      staticContentArtifactRef: "market-static-content/cz/faq.json",
      staticContentArtifactSha256: "a".repeat(64),
    },
    kind: "approved",
  })),
}))
vi.mock(
  "@/lib/url/segment-registry-publication/reviewed-source.server",
  () => ({
    assertReviewedStaticRouteSource: vi.fn(() => Promise.resolve()),
  })
)

import { getServerSideProps } from "@/pages/~sf/[market]/static/[pageKey]"

const requestContext = (pageKey = "faq", market = "cz") => {
  const canonicalOrigin = `https://herbatica.${market}`
  const headers = new Map<string, string>()
  const context = {
    params: { market, pageKey },
    query: {},
    req: {
      headers: {
        "x-sf-canonical-origin": canonicalOrigin,
        "x-sf-market": market,
        "x-sf-public-path": `/${pageKey}`,
        "x-sf-route-key": `static.${pageKey}`,
      },
      url: `/~sf/${market}/static/${pageKey}`,
    },
    res: {
      setHeader: vi.fn((name: string, value: string) => {
        headers.set(name.toLowerCase(), value)
      }),
      statusCode: 200,
    },
  } as unknown as GetServerSidePropsContext
  return { context, headers }
}

describe("localized FAQ route", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns a noindex 503 instead of an empty indexable page", async () => {
    const { readCmsStaticPageWithDemoFallback } = await import(
      "@/lib/storefront/cms"
    )
    vi.mocked(readCmsStaticPageWithDemoFallback).mockResolvedValueOnce({
      causeCode: "EMPTY_STATIC_PAGE_CONTENT",
      kind: "invalid-response",
    })
    const request = requestContext()

    const result = await getServerSideProps(request.context)

    expect(readCmsStaticPageWithDemoFallback).toHaveBeenCalledWith(
      "faq",
      "cs-CZ"
    )
    expect(result).toMatchObject({
      props: {
        page: { kind: "error", status: 503 },
        seo: { robots: "noindex, nofollow" },
      },
    })
    expect(request.context.res.statusCode).toBe(503)
    expect(request.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(request.headers.get("retry-after")).toBe("30")
    expect(request.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate"
    )
  })

  it.each(
    (["sk", "cz", "hu", "ro"] as const).flatMap((market) => [
      [market, "about"],
      [market, "faq"],
    ])
  )("returns a noindex 503 for %s %s when G1 evidence is absent", async (market, pageKey) => {
    const { readCmsStaticPageWithDemoFallback } = await import(
      "@/lib/storefront/cms"
    )
    const { loadStaticRoutePublicationDecision } = await import(
      "@/lib/url/segment-registry-publication.server"
    )
    vi.mocked(loadStaticRoutePublicationDecision).mockResolvedValueOnce({
      kind: "rejected",
      reason: "artifact-unavailable",
    })
    const request = requestContext(pageKey, market)

    const result = await getServerSideProps(request.context)

    expect(result).toMatchObject({
      props: {
        page: { kind: "error", status: 503 },
        seo: { robots: "noindex, nofollow" },
      },
    })
    expect(
      (result as { props: { seo: { canonical?: string } } }).props.seo.canonical
    ).toBeUndefined()
    expect(request.context.res.statusCode).toBe(503)
    expect(request.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(request.headers.get("retry-after")).toBe("30")
    expect(request.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate"
    )
    expect(readCmsStaticPageWithDemoFallback).not.toHaveBeenCalled()
    expect(mocks.readRequiredPublicEntitySlugs).not.toHaveBeenCalled()
  })

  it("keeps a real CMS page noindex when the market taxonomy excludes it from G1", async () => {
    const { readCmsStaticPageWithDemoFallback } = await import(
      "@/lib/storefront/cms"
    )
    const { loadStaticRoutePublicationDecision } = await import(
      "@/lib/url/segment-registry-publication.server"
    )
    vi.mocked(loadStaticRoutePublicationDecision).mockResolvedValueOnce({
      kind: "not-required",
      reason: "route-not-indexable",
    })
    vi.mocked(readCmsStaticPageWithDemoFallback).mockResolvedValueOnce({
      kind: "found",
      value: {
        content: "Date de contact verificate",
        id: 77,
        title: "Contact",
      },
    })
    const request = requestContext("contact", "ro")

    const result = await getServerSideProps(request.context)

    expect(result).toMatchObject({
      props: {
        page: {
          kind: "found",
          value: { kind: "cms", publicationApproved: false },
        },
        seo: { alternates: {}, robots: "noindex, follow" },
      },
    })
    expect(
      (result as { props: { seo: { canonical?: string } } }).props.seo.canonical
    ).toBeUndefined()
  })
})
