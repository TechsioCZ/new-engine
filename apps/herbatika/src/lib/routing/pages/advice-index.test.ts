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

describe("advice index CMS source", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("passes the canonical category and page to the CMS listing loader", async () => {
    const { fetchCmsBlogListing } = await import("@/lib/storefront/cms")
    vi.mocked(fetchCmsBlogListing).mockResolvedValue({
      category: "zdravie & krása",
      categoryFilters: [],
      page: 2,
      posts: [{ slug: "zdravy-spanok", sourceId: "article-1" }],
      totalItems: 1,
      totalPages: 1,
    } as never)
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
