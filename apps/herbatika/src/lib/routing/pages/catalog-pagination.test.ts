import type { GetServerSidePropsContext } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchServerCategories: vi.fn(),
  fetchStorefrontBrands: vi.fn(),
  getRegionServerContext: vi.fn(),
  findActiveEquivalents: vi.fn(),
  listAuditRecords: vi.fn(),
  prefetchBrandPageStorefrontData: vi.fn(),
  prefetchCategoryPageStorefrontData: vi.fn(),
  prefetchProductIndexStorefrontData: vi.fn(),
  readAvailablePublicEntitySlugs: vi.fn(),
  readCompletePublicEntitySlugs: vi.fn(),
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
  fetchCmsFooterNavigation: vi.fn(async () => ({ columns: [] })),
}))
vi.mock("@/lib/storefront/external-reviews.server", () => ({
  fetchExternalReviewTrustSources: vi.fn(async () => []),
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
  readAvailablePublicEntitySlugs: mocks.readAvailablePublicEntitySlugs,
  readCompletePublicEntitySlugs: mocks.readCompletePublicEntitySlugs,
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
}))
vi.mock("@/lib/storefront/storefront-server", () => ({
  fetchServerCategories: mocks.fetchServerCategories,
}))
vi.mock("@/lib/storefront/storefront-texts.server", () => ({
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: vi.fn(async () => ({
    enabled: true,
    registry: {
      findActiveEquivalents: mocks.findActiveEquivalents,
      listAuditRecords: mocks.listAuditRecords,
      resolve: mocks.resolveRegistryRoute,
    },
  })),
}))

const timestamp = "2026-08-21T10:00:00.000Z"

const context = (
  routeKey: string,
  publicPath: string,
  slug?: string,
  page = "9999"
): GetServerSidePropsContext => {
  const setHeader = vi.fn()
  return {
    params: { market: "sk", ...(slug ? { slug } : {}) },
    query: { page },
    req: {
      headers: {
        "x-sf-canonical-origin": "https://herbatica.sk",
        "x-sf-market": "sk",
        "x-sf-public-path": publicPath,
        "x-sf-route-key": routeKey,
      },
      url: `${publicPath}?page=${page}`,
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
      region: {},
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
    mocks.readAvailablePublicEntitySlugs.mockResolvedValue({
      kind: "found",
      value: {},
    })
    mocks.readCompletePublicEntitySlugs.mockResolvedValue({
      kind: "found",
      value: { cat_1: "herbs" },
    })
    mocks.findActiveEquivalents.mockResolvedValue({
      kind: "found",
      value: [],
    })
    mocks.listAuditRecords.mockResolvedValue({
      kind: "found",
      value: {
        items: [
          {
            resultVersion: 1,
            routeId: "route-brand",
            source: {
              sourceId: "brand_1",
              sourceSystem: "medusa",
              sourceType: "brand",
              sourceVersion: "7",
            },
          },
          {
            resultVersion: 1,
            routeId: "route-category",
            source: {
              sourceId: "cat_1",
              sourceSystem: "medusa",
              sourceType: "category",
              sourceVersion: "7",
            },
          },
        ],
        nextCursor: null,
      },
    })
    mocks.resolveRegistryRoute.mockImplementation(
      ({ kind }: { kind: "brand" | "category" }) => {
        const normalizedSlug = kind === "brand" ? "brand" : "herbs"
        const route = {
          createdAt: timestamp,
          equivalenceKey: `${kind}:${kind === "brand" ? "brand_1" : "cat_1"}`,
          id: `route-${kind}`,
          indexPolicy: "indexable",
          kind,
          market: "sk",
          sourceId: kind === "brand" ? "brand_1" : "cat_1",
          sourceSystem: "medusa",
          sourceType: kind,
          staticRouteKey: null,
          status: "active",
          successorRouteId: null,
          targetType: "entity",
          updatedAt: timestamp,
          version: 1,
        } as const
        const currentSlug = {
          createdAt: timestamp,
          disposition: "current",
          id: `slug-${kind}`,
          kind,
          market: "sk",
          normalizationVersion: 1,
          normalizedSlug,
          routeId: route.id,
        } as const
        return Promise.resolve({
          kind: "found",
          value: {
            currentSlug,
            disposition: "current",
            matchedSlug: currentSlug,
            route,
          },
        })
      }
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

  it("keeps the category's exact last page found", async () => {
    const request = context("category.detail", "/kategorie/herbs", "herbs", "3")
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/category/[slug]"
    )

    await expect(getServerSideProps(request)).resolves.toMatchObject({
      props: {
        page: { kind: "found", value: { totalPages: 3 } },
      },
    })
  })

  it("loads a complete projection set for category trees larger than the required-ID limit", async () => {
    const categorySourceIds = Array.from(
      { length: 206 },
      (_, index) => `cat_${index + 1}`
    )
    mocks.prefetchCategoryPageStorefrontData.mockResolvedValue({
      categorySourceIds,
      dehydratedState: {},
      region: {},
      totalPages: 3,
      visibleProductIds: [],
    })
    const request = context("category.detail", "/kategorie/herbs", "herbs", "2")
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/category/[slug]"
    )

    await expect(getServerSideProps(request)).resolves.toMatchObject({
      props: { page: { kind: "found" } },
    })
    expect(mocks.readCompletePublicEntitySlugs).toHaveBeenCalledWith({
      kind: "category",
      market: "sk",
      rejectUnexpectedSourceIds: true,
      requiredSourceIds: categorySourceIds,
    })
    expect(mocks.readRequiredPublicEntitySlugs).not.toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "category",
        requiredSourceIds: categorySourceIds,
      })
    )
  })

  it("keeps the brand's exact last page found", async () => {
    const request = context("brand.detail", "/znacka/brand", "brand", "4")
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/brand/[slug]"
    )

    await expect(getServerSideProps(request)).resolves.toMatchObject({
      props: {
        page: { kind: "found", value: { totalPages: 4 } },
      },
    })
  })

  it("keeps the product index's exact last page found", async () => {
    const request = context("product.index", "/produkty", undefined, "5")
    const { getServerSideProps } = await import("@/pages/~sf/[market]/products")

    await expect(getServerSideProps(request)).resolves.toMatchObject({
      props: {
        page: { kind: "found", value: { totalPages: 5 } },
      },
    })
  })
})
