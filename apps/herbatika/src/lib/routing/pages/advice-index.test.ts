import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/blog/blog-listing-page", () => ({
  BlogListingPage: vi.fn(),
}))
vi.mock("@/lib/routing/public-page", () => ({
  foundSource: vi.fn((value: unknown) => ({ kind: "found", value })),
  resolveStaticPublicPage: vi.fn(
    (_context: unknown, input: { loadSource: (market: "sk") => unknown }) =>
      input.loadSource("sk")
  ),
}))
vi.mock("@/lib/storefront/cms", () => ({
  fetchCmsBlogListing: vi.fn(),
}))
vi.mock("@/lib/storefront/market-context", () => ({
  getHerbatikaMarketContext: vi.fn(() => ({ locale: "sk-SK" })),
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readAvailablePublicEntitySlugs: vi.fn(),
}))

describe("advice index CMS source", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("passes the canonical category and page to the CMS listing loader", async () => {
    const { fetchCmsBlogListing } = await import("@/lib/storefront/cms")
    const { readAvailablePublicEntitySlugs } = await import(
      "@/lib/storefront/ssr/public-entity-projections"
    )
    vi.mocked(fetchCmsBlogListing).mockResolvedValue({
      category: "zdravie & krása",
      categoryFilters: [],
      page: 2,
      posts: [{ sourceId: "article-1" }],
      totalItems: 1,
      totalPages: 1,
    } as never)
    vi.mocked(readAvailablePublicEntitySlugs).mockResolvedValue({
      kind: "found",
      value: { "article-1": "zdravy-spanok" },
    })
    const { getServerSideProps } = await import("@/pages/~sf/[market]/advice")

    await getServerSideProps({
      query: { category: "zdravie & krása", page: "2" },
    } as never)

    expect(fetchCmsBlogListing).toHaveBeenCalledWith({
      category: "zdravie & krása",
      locale: "sk-SK",
      page: 2,
    })
  })
})
