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
    allowedMarkets: ["cz"],
    bindings: {
      cz: {
        acceptedHosts: ["herbatica.cz"],
        canonicalOrigin: "https://herbatica.cz",
        market: "cz",
      },
    },
    marketByHost: { "herbatica.cz": "cz" },
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
  HOMEPAGE_SECTION_CATEGORY_HANDLES: {},
}))
vi.mock("@/lib/storefront/homepage-hero-source-manifest.server", () => ({
  readReviewedHomepageHeroBanners: mocks.readReviewedHomepageHeroBanners,
}))
vi.mock("@/lib/storefront/market-context", () => ({
  getHerbatikaMarketContext: vi.fn((_market: string, domain = "") => ({
    code: "cz",
    countryCode: "cz",
    currencyCode: "CZK",
    domain,
    htmlLang: "cs-CZ",
    locale: "cs-CZ",
    metadata: { description: "Test", title: "Herbatica" },
    timeZone: "Europe/Prague",
  })),
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

const requestContext = () => {
  const headers = new Map<string, string>()
  const context = {
    params: { market: "cz" },
    query: {},
    req: {
      headers: {
        "x-sf-canonical-origin": "https://herbatica.cz",
        "x-sf-market": "cz",
        "x-sf-public-path": "/",
        "x-sf-route-key": "home",
      },
      url: "/~sf/cz/home",
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
  it("returns an explicit noindex 503 when CZ has no CMS or reviewed source", async () => {
    const request = requestContext()

    const result = await getServerSideProps(request.context)

    expect(mocks.readReviewedHomepageHeroBanners).toHaveBeenCalledWith("cs-CZ")
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
