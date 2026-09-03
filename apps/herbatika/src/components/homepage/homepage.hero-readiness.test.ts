import type { GetServerSidePropsContext } from "next"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchCachedLatestCmsBlogPosts: vi.fn(async () => []),
  fetchCmsFooterNavigation: vi.fn(async () => ({ columns: [] })),
  fetchCmsHeroBanners: vi.fn(async () => []),
  fetchCmsHomepagePromo: vi.fn(async () => null),
  fetchExternalReviewTrustSources: vi.fn(async () => []),
  fetchHeurekaHomepageReviews: vi.fn(async () => null),
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
  getRegionServerContext: vi.fn(async () => ({
    region: {
      country_code: "ro",
      currency_code: "eur",
      name: "Test region",
      region_id: "reg_test",
    },
  })),
  hydrateCmsHeroBannerTargets: vi.fn(async (banners) => ({
    kind: "found",
    value: banners,
  })),
  prefetchHomePageStorefrontData: vi.fn(async () => ({
    categorySourceIds: [],
    dehydratedState: { mutations: [], queries: [] },
    homepageSectionCategorySourceIds: {},
    region: { id: "reg_cz" } as { id: string } | null,
    visibleProductIds: [],
  })),
  readAvailablePublicEntitySlugs: vi.fn(async () => ({
    kind: "found",
    value: {},
  })),
  readCompletePublicEntitySlugs: vi.fn(async () => ({
    kind: "found",
    value: {},
  })),
  readRequiredPublicEntitySlugs: vi.fn(async () => ({
    kind: "found",
    value: {},
  })),
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
vi.mock("@/lib/storefront/cms-footer-navigation", () => ({
  fetchCmsFooterNavigation: mocks.fetchCmsFooterNavigation,
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
vi.mock("@/lib/storefront/ssr/context", () => ({
  getRegionServerContext: mocks.getRegionServerContext,
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readAvailablePublicEntitySlugs: mocks.readAvailablePublicEntitySlugs,
  readCompletePublicEntitySlugs: mocks.readCompletePublicEntitySlugs,
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
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
    "cz",
    "hu",
    "ro",
  ] as const)("renders the approved bundled hero source for %s without CMS content", async (market) => {
    const request = requestContext(market)

    const result = await getServerSideProps(request.context)

    expect(mocks.readReviewedHomepageHeroBanners).not.toHaveBeenCalled()
    expect(mocks.hydrateCmsHeroBannerTargets).toHaveBeenCalled()
    expect(result).toMatchObject({
      props: {
        page: {
          kind: "found",
          value: { publicationApproved: true },
        },
        seo: { robots: "index, follow" },
      },
    })
    expect(request.context.res.statusCode).toBe(200)
  })

  it("returns 503 when commerce region authority is missing", async () => {
    mocks.prefetchHomePageStorefrontData.mockResolvedValueOnce({
      categorySourceIds: [],
      dehydratedState: { mutations: [], queries: [] },
      homepageSectionCategorySourceIds: {},
      region: null,
      visibleProductIds: [],
    })
    const request = requestContext("ro")

    const result = await getServerSideProps(request.context)

    expect(result).toMatchObject({
      props: {
        page: { kind: "error", status: 503 },
      },
    })
    expect(request.context.res.statusCode).toBe(503)
  })

  it("keeps the RO homepage available when optional CMS sources reject", async () => {
    mocks.fetchCmsHeroBanners.mockRejectedValueOnce(
      new Error("CMS unavailable")
    )
    mocks.fetchCmsHomepagePromo.mockRejectedValueOnce(
      new Error("CMS unavailable")
    )
    mocks.fetchCachedLatestCmsBlogPosts.mockRejectedValueOnce(
      new Error("CMS unavailable")
    )
    mocks.fetchHeurekaHomepageReviews.mockRejectedValueOnce(
      new Error("reviews unavailable")
    )
    const request = requestContext("ro")

    const result = await getServerSideProps(request.context)

    expect(result).toMatchObject({
      props: {
        page: {
          kind: "found",
          value: {
            blogPosts: [],
            homepagePromo: null,
            homepageReviewsData: null,
            publicationApproved: true,
          },
        },
        seo: { robots: "index, follow" },
      },
    })
    expect(request.context.res.statusCode).toBe(200)
  })
})
