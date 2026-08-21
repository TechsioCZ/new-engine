import type { GetServerSidePropsContext } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchStorefrontBrands: vi.fn(),
  prefetchBrandPageStorefrontData: vi.fn(),
  readCompletePublicEntitySlugs: vi.fn(),
  readRequiredPublicEntitySlugs: vi.fn(),
  resolveEntityPublicPage: vi.fn(),
  resolveRegistryRoute: vi.fn(),
  resolveStaticPublicPage: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/components/brands/brand-index-page", () => ({
  BrandIndexPage: vi.fn(),
}))
vi.mock("@/components/brands/brand-listing", () => ({
  BrandListing: vi.fn(),
}))
vi.mock("@/lib/storefront/brands.server", () => ({
  fetchStorefrontBrands: mocks.fetchStorefrontBrands,
}))
vi.mock("@/lib/routing/public-page", () => ({
  foundSource: (value: unknown) => ({ kind: "found", value }),
  resolveEntityPublicPage: mocks.resolveEntityPublicPage,
  resolveStaticPublicPage: mocks.resolveStaticPublicPage,
}))
vi.mock("@/lib/storefront/cms-footer-navigation", () => ({
  fetchCmsFooterNavigation: vi.fn(async () => ({ columns: [] })),
}))
vi.mock("@/lib/storefront/external-reviews.server", () => ({
  fetchExternalReviewTrustSources: vi.fn(async () => []),
}))
vi.mock("@/lib/storefront/market-context", () => ({
  getHerbatikaMarketContext: vi.fn(() => ({ locale: "ro-RO" })),
}))
vi.mock("@/lib/storefront/ssr", () => ({
  prefetchBrandPageStorefrontData: mocks.prefetchBrandPageStorefrontData,
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readCompletePublicEntitySlugs: mocks.readCompletePublicEntitySlugs,
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
}))
vi.mock("@/lib/storefront/storefront-texts.server", () => ({
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: vi.fn(async () => ({
    enabled: true,
    registry: { resolve: mocks.resolveRegistryRoute },
  })),
}))

const allBrands = Array.from({ length: 128 }, (_, index) => ({
  facetId: `brand-brand-${index + 1}`,
  handle: `brand-${index + 1}`,
  id: `brand_${index + 1}`,
  title: `Brand ${index + 1}`,
}))
const publishedRomanianBrands = allBrands.slice(0, 103).map((brand, index) => ({
  ...brand,
  title: `Marcă românească ${index + 1}`,
}))
const excludedRomanianBrands = allBrands.slice(103)

const context = ({
  path,
  routeKey,
  slug,
}: {
  path: string
  routeKey: string
  slug?: string
}): GetServerSidePropsContext =>
  ({
    params: { market: "ro", ...(slug ? { slug } : {}) },
    query: {},
    req: {
      headers: {
        "x-sf-canonical-origin": "https://herbatica.ro",
        "x-sf-market": "ro",
        "x-sf-public-path": path,
        "x-sf-route-key": routeKey,
      },
      url: path,
    },
    res: { setHeader: vi.fn() },
  }) as unknown as GetServerSidePropsContext

describe("Romanian Brand publication pages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchStorefrontBrands.mockImplementation(async (market: string) =>
      market === "ro" ? publishedRomanianBrands : allBrands
    )
    mocks.readCompletePublicEntitySlugs.mockImplementation(
      async ({ requiredSourceIds }: { requiredSourceIds: string[] }) => ({
        kind: "found",
        value: Object.fromEntries(
          requiredSourceIds.map((id) => [id, `public-${id}`])
        ),
      })
    )
    mocks.readRequiredPublicEntitySlugs.mockResolvedValue({
      kind: "found",
      value: {},
    })
    mocks.prefetchBrandPageStorefrontData.mockResolvedValue({
      dehydratedState: {},
      region: {},
      totalPages: 1,
      visibleProductIds: [],
    })
    mocks.resolveStaticPublicPage.mockImplementation(
      async (
        _context: unknown,
        input: { loadSource: (market: string) => unknown }
      ) => ({
        props: { page: await input.loadSource("ro") },
      })
    )
    mocks.resolveEntityPublicPage.mockImplementation(
      async (
        _context: unknown,
        input: {
          loadSource: (identity: {
            market: string
            publicSlug: string
            sourceId: string
            sourceVersion: string
          }) => Promise<{ kind: string }>
        }
      ) => {
        const source = await input.loadSource({
          market: "ro",
          publicSlug: "brand-exclus",
          sourceId: excludedRomanianBrands[0]?.id ?? "brand_excluded",
          sourceVersion: "7",
        })
        return source.kind === "missing"
          ? { notFound: true }
          : { props: { page: source } }
      }
    )
  })

  it("renders exactly the 103 backend-published Romanian Brands with complete URL projections", async () => {
    const { getServerSideProps } = await import("@/pages/~sf/[market]/brands")

    const result = await getServerSideProps(
      context({ path: "/marci", routeKey: "brand.index" })
    )

    expect(result).toMatchObject({
      props: {
        page: {
          kind: "found",
          value: { brands: expect.any(Array) },
        },
      },
    })
    if (!("props" in result && result.props)) {
      throw new Error("Expected Romanian Brand index props")
    }
    const props = await result.props
    const page = props.page
    if (page.kind !== "found") {
      throw new Error("Expected Romanian Brand index source")
    }
    expect(page.value.brands).toHaveLength(103)
    expect(page.value.brands).toEqual(
      publishedRomanianBrands.map((brand) => ({
        ...brand,
        publicSlug: `public-${brand.id}`,
      }))
    )
    expect(mocks.readCompletePublicEntitySlugs).toHaveBeenCalledWith({
      kind: "brand",
      market: "ro",
      rejectUnexpectedSourceIds: true,
      requiredSourceIds: publishedRomanianBrands.map(({ id }) => id),
    })
    expect(excludedRomanianBrands).toHaveLength(25)
    const excludedIds = new Set(excludedRomanianBrands.map(({ id }) => id))
    expect(page.value.brands.some(({ id }) => excludedIds.has(id))).toBe(false)
  })

  it("returns 404 before product prefetch when an RO URL resolves to one of the 25 excluded Brands", async () => {
    const excluded = excludedRomanianBrands[0]
    if (!excluded) {
      throw new Error("Expected an excluded Romanian Brand fixture")
    }
    mocks.resolveRegistryRoute.mockResolvedValue({
      kind: "found",
      value: {
        currentSlug: { normalizedSlug: "brand-exclus" },
        disposition: "current",
        route: { sourceId: excluded.id },
      },
    })
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/brand/[slug]"
    )

    await expect(
      getServerSideProps(
        context({
          path: "/marci/brand-exclus",
          routeKey: "brand.detail",
          slug: "brand-exclus",
        })
      )
    ).resolves.toEqual({ notFound: true })
    expect(mocks.prefetchBrandPageStorefrontData).not.toHaveBeenCalled()
    expect(mocks.readRequiredPublicEntitySlugs).not.toHaveBeenCalled()
  })
})
