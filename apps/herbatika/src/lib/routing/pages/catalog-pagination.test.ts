import type { GetServerSidePropsContext } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchServerCategories: vi.fn(),
  fetchStorefrontBrands: vi.fn(),
  getRegionServerContext: vi.fn(),
  prefetchBrandPageStorefrontData: vi.fn(),
  prefetchCategoryPageStorefrontData: vi.fn(),
  prefetchProductIndexStorefrontData: vi.fn(),
  readRequiredPublicEntitySlugs: vi.fn(),
  resolveRegistryRoute: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/components/brands/brand-listing", () => ({
  BrandListing: vi.fn(),
}))
vi.mock("@/components/category-listing", () => ({
  CategoryListing: vi.fn(),
}))
vi.mock("@/components/products/product-index-page", () => ({
  ProductIndexPage: vi.fn(),
}))
vi.mock("@/lib/storefront/brands.server", () => ({
  fetchStorefrontBrands: mocks.fetchStorefrontBrands,
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
vi.mock("@/lib/storefront/ssr", () => ({
  prefetchBrandPageStorefrontData: mocks.prefetchBrandPageStorefrontData,
  prefetchCategoryPageStorefrontData: mocks.prefetchCategoryPageStorefrontData,
  prefetchProductIndexStorefrontData: mocks.prefetchProductIndexStorefrontData,
}))
vi.mock("@/lib/storefront/ssr/context", () => ({
  getRegionServerContext: mocks.getRegionServerContext,
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
}))
vi.mock("@/lib/storefront/storefront-server", () => ({
  fetchServerCategories: mocks.fetchServerCategories,
}))
vi.mock("@/lib/storefront/storefront-texts.server", () => ({
  fetchStorefrontTextMessages: vi.fn(),
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: vi.fn(async () => ({
    enabled: true,
    registry: { resolve: mocks.resolveRegistryRoute },
  })),
}))

const context = (
  routeKey: string,
  publicPath: string,
  slug?: string
): GetServerSidePropsContext => {
  const setHeader = vi.fn()
  return {
    params: { market: "sk", ...(slug ? { slug } : {}) },
    query: { page: "9999" },
    req: {
      headers: {
        "x-sf-canonical-origin": "https://herbatica.sk",
        "x-sf-market": "sk",
        "x-sf-public-path": publicPath,
        "x-sf-route-key": routeKey,
      },
      url: `${publicPath}?page=9999`,
    },
    res: { setHeader },
  } as unknown as GetServerSidePropsContext
}

describe("catalog page pagination boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchServerCategories.mockResolvedValue({
      categories: [{ handle: "herbs", id: "cat_1", name: "Herbs" }],
    })
    mocks.fetchStorefrontBrands.mockResolvedValue([
      { facetId: "brand-facet", id: "brand_1", title: "Brand" },
    ])
    mocks.getRegionServerContext.mockResolvedValue({
      locale: "sk-SK",
      queryClient: {},
    })
    mocks.prefetchBrandPageStorefrontData.mockResolvedValue({
      dehydratedState: {},
      region: {},
      totalPages: 4,
      visibleProductIds: [],
    })
    mocks.prefetchCategoryPageStorefrontData.mockResolvedValue({
      categorySourceIds: ["cat_1"],
      dehydratedState: {},
      region: {},
      totalPages: 3,
      visibleProductIds: [],
    })
    mocks.prefetchProductIndexStorefrontData.mockResolvedValue({
      dehydratedState: {},
      region: {},
      totalPages: 5,
      visibleProductIds: [],
    })
    mocks.readRequiredPublicEntitySlugs.mockResolvedValue({
      kind: "found",
      value: { brand_1: "brand" },
    })
    mocks.resolveRegistryRoute.mockImplementation(
      ({ kind }: { kind: "brand" | "category" }) =>
        Promise.resolve({
          kind: "found",
          value: {
            currentSlug: {
              normalizedSlug: kind === "brand" ? "brand" : "herbs",
            },
            disposition: "current",
            route: { sourceId: kind === "brand" ? "brand_1" : "cat_1" },
          },
        })
    )
  })

  it("returns noindex 404 beyond the category's exact last page", async () => {
    const request = context("category.detail", "/kategorie/herbs", "herbs")
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/category/[slug]"
    )

    await expect(getServerSideProps(request)).resolves.toEqual({
      notFound: true,
    })
    expect(mocks.prefetchCategoryPageStorefrontData).toHaveBeenCalledWith(
      "herbs",
      expect.objectContaining({ page: 9999 }),
      expect.objectContaining({ market: "sk" })
    )
    expect(request.res.setHeader).toHaveBeenCalledWith(
      "X-Robots-Tag",
      "noindex, nofollow"
    )
  })

  it("returns noindex 404 beyond the brand's exact last page", async () => {
    const request = context("brand.detail", "/znacka/brand", "brand")
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/brand/[slug]"
    )

    await expect(getServerSideProps(request)).resolves.toEqual({
      notFound: true,
    })
    expect(mocks.prefetchBrandPageStorefrontData).toHaveBeenCalledWith(
      "brand-facet",
      expect.objectContaining({ page: 9999 }),
      expect.objectContaining({ market: "sk" })
    )
    expect(request.res.setHeader).toHaveBeenCalledWith(
      "X-Robots-Tag",
      "noindex, nofollow"
    )
  })

  it("returns noindex 404 beyond the product index's exact last page", async () => {
    const request = context("product.index", "/produkty")
    const { getServerSideProps } = await import("@/pages/~sf/[market]/products")

    await expect(getServerSideProps(request)).resolves.toEqual({
      notFound: true,
    })
    expect(mocks.prefetchProductIndexStorefrontData).toHaveBeenCalledWith(
      expect.objectContaining({ page: 9999 }),
      expect.objectContaining({ market: "sk" })
    )
    expect(request.res.setHeader).toHaveBeenCalledWith(
      "X-Robots-Tag",
      "noindex, nofollow"
    )
  })
})
