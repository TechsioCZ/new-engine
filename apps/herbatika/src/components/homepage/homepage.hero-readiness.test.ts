import type { GetServerSidePropsContext } from "next"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchCachedLatestCmsBlogPosts: vi.fn(async () => []),
  fetchCmsHeroBanners: vi.fn(async () => []),
  fetchCmsHomepagePromo: vi.fn(async () => null),
  fetchExternalReviewTrustSources: vi.fn(async () => []),
  fetchHeurekaHomepageReviews: vi.fn(async () => null),
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
  hydrateCmsHeroBannerTargets: vi.fn(),
  prefetchHomePageStorefrontData: vi.fn(async () => ({
    categorySourceIds: [],
    dehydratedState: { mutations: [], queries: [] },
    homepageSectionCategorySourceIds: {},
    region: { id: "reg_cz" },
    visibleProductIds: [],
  })),
  readAvailablePublicEntitySlugs: vi.fn(),
  readCompletePublicEntitySlugs: vi.fn(),
  readReviewedHomepageHeroBanners: vi.fn(
    function missingReviewedHomepageHeroManifest(): undefined {
      return
    }
  ),
}))

vi.mock("@/components/herbatika-homepage", () => ({
  HerbatikaHomepage: vi.fn(),
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
      hu: {
        acceptedHosts: ["herbatica.hu"],
        canonicalOrigin: "https://herbatica.hu",
        market: "hu",
      },
      ro: {
        acceptedHosts: ["herbatica.ro"],
        canonicalOrigin: "https://herbatica.ro",
        market: "ro",
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
  fetchCachedLatestCmsBlogPosts: mocks.fetchCachedLatestCmsBlogPosts,
  fetchCmsHeroBanners: mocks.fetchCmsHeroBanners,
  fetchCmsHomepagePromo: mocks.fetchCmsHomepagePromo,
}))
vi.mock("@/lib/storefront/cms-hero-targets.server", () => ({
  hydrateCmsHeroBannerTargets: mocks.hydrateCmsHeroBannerTargets,
}))
vi.mock("@/lib/storefront/external-reviews.server", () => ({
  fetchExternalReviewTrustSources: mocks.fetchExternalReviewTrustSources,
  fetchHeurekaHomepageReviews: mocks.fetchHeurekaHomepageReviews,
}))
vi.mock("@/lib/storefront/homepage-catalog-config", () => ({
  hasCompleteHomepageSectionSources: vi.fn(() => true),
  HOMEPAGE_SECTION_CATEGORY_HANDLES: {},
}))
vi.mock("@/lib/storefront/homepage-hero-source-manifest.server", () => ({
  readReviewedHomepageHeroBanners: mocks.readReviewedHomepageHeroBanners,
}))
vi.mock("@/lib/storefront/market-context", () => ({
  getHerbatikaMarketContext: vi.fn((market: string, domain = "") => {
    const localeByMarket = {
      cz: "cs-CZ",
      hu: "hu-HU",
      ro: "ro-RO",
      sk: "sk-SK",
    } as const
    return {
      code: market,
      countryCode: market,
      currencyCode: market === "cz" ? "CZK" : "EUR",
      domain,
      htmlLang: localeByMarket[market as keyof typeof localeByMarket],
      locale: localeByMarket[market as keyof typeof localeByMarket],
      metadata: { description: "Test", title: "Herbatica" },
      timeZone: "Europe/Prague",
    }
  }),
}))
vi.mock("@/lib/storefront/ssr", () => ({
  prefetchHomePageStorefrontData: mocks.prefetchHomePageStorefrontData,
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readAvailablePublicEntitySlugs: mocks.readAvailablePublicEntitySlugs,
  readCompletePublicEntitySlugs: mocks.readCompletePublicEntitySlugs,
}))
vi.mock("@/lib/storefront/storefront-texts.server", () => ({
  fetchStorefrontTextMessages: mocks.fetchStorefrontTextMessages,
}))

import { getServerSideProps } from "@/pages/~sf/[market]/home"

const requestContext = (market: "cz" | "hu" | "ro" = "cz") => {
  const canonicalOrigin = `https://herbatica.${market}`
  const headers = new Map<string, string>()
  const context = {
    params: { market },
    query: {},
    req: {
      headers: {
        "x-sf-canonical-origin": canonicalOrigin,
        "x-sf-market": market,
        "x-sf-public-path": "/",
        "x-sf-route-key": "home",
      },
      url: `/~sf/${market}/home`,
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

describe("homepage hero readiness", () => {
  it.each([
    ["cz", "cs-CZ"],
    ["hu", "hu-HU"],
    ["ro", "ro-RO"],
  ] as const)("returns an explicit noindex 503 when %s has no publication-ready source", async (market, locale) => {
    const request = requestContext(market)

    const result = await getServerSideProps(request.context)

    expect(mocks.readReviewedHomepageHeroBanners).toHaveBeenCalledWith(locale)
    expect(mocks.hydrateCmsHeroBannerTargets).not.toHaveBeenCalled()
    expect(mocks.readAvailablePublicEntitySlugs).not.toHaveBeenCalled()
    expect(mocks.readCompletePublicEntitySlugs).not.toHaveBeenCalled()
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
})
