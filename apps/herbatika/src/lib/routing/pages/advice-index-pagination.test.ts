import type { GetServerSidePropsContext } from "next"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchCmsBlogListing: vi.fn(),
  readRequiredPublicEntitySlugs: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/components/blog/blog-listing-page", () => ({
  BlogListingPage: vi.fn(),
}))
vi.mock("@/lib/storefront/cms", () => ({
  fetchCmsBlogListing: mocks.fetchCmsBlogListing,
}))
vi.mock("@/lib/storefront/cms-footer-navigation", () => ({
  fetchCmsFooterNavigation: vi.fn(),
}))
vi.mock("@/lib/storefront/external-reviews.server", () => ({
  fetchExternalReviewTrustSources: vi.fn(),
}))
vi.mock("@/lib/storefront/market-context", () => ({
  getHerbatikaMarketContext: vi.fn(() => ({ locale: "sk-SK" })),
}))
vi.mock("@/lib/storefront/ssr/context", () => ({
  getRegionServerContext: vi.fn(),
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
}))
vi.mock("@/lib/storefront/storefront-texts.server", () => ({
  fetchStorefrontTextMessages: vi.fn(),
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: vi.fn(),
}))

describe("advice index pagination boundary", () => {
  it("returns not found when the requested page exceeds the loaded listing", async () => {
    mocks.fetchCmsBlogListing.mockResolvedValue({
      category: "all",
      categoryFilters: [],
      page: 3,
      posts: [],
      totalItems: 25,
      totalPages: 3,
    })
    mocks.readRequiredPublicEntitySlugs.mockResolvedValue({
      kind: "found",
      value: {},
    })
    const setHeader = vi.fn()
    const context = {
      params: { market: "sk" },
      query: { page: "9999" },
      req: {
        headers: {
          "x-sf-canonical-origin": "https://herbatica.sk",
          "x-sf-market": "sk",
          "x-sf-public-path": "/poradna",
          "x-sf-route-key": "article.index",
        },
        url: "/poradna?page=9999",
      },
      res: { setHeader },
    } as unknown as GetServerSidePropsContext
    const { getServerSideProps } = await import("@/pages/~sf/[market]/advice")

    await expect(getServerSideProps(context)).resolves.toEqual({
      notFound: true,
    })
    expect(mocks.fetchCmsBlogListing).toHaveBeenCalledWith({
      category: undefined,
      locale: "sk-SK",
      page: 9999,
    })
    expect(setHeader).toHaveBeenCalledWith("X-Robots-Tag", "noindex, nofollow")
  })
})
