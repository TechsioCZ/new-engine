import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  parsePlpQueryStateFromSearchParams: vi.fn(),
  prefetchSearchPageStorefrontData: vi.fn(),
  readRequiredPublicEntitySlugs: vi.fn(),
  resolveFlowPublicPage: vi.fn(),
}))

vi.mock("@/components/search-results", () => ({
  SearchResults: () => null,
}))
vi.mock("@/lib/routing/public-page", () => ({
  foundSource: <Value,>(value: Value) => ({ kind: "found", value }),
  resolveFlowPublicPage: mocks.resolveFlowPublicPage,
}))
vi.mock("@/lib/storefront/plp-query-state", () => ({
  parsePlpQueryStateFromSearchParams: mocks.parsePlpQueryStateFromSearchParams,
}))
vi.mock("@/lib/storefront/ssr", () => ({
  prefetchSearchPageStorefrontData: mocks.prefetchSearchPageStorefrontData,
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
}))

import { getServerSideProps } from "@/pages/~sf/[market]/search"

describe("search page URL projections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.parsePlpQueryStateFromSearchParams.mockReturnValue({ q: "herbs" })
    mocks.prefetchSearchPageStorefrontData.mockResolvedValue({
      dehydratedState: { mutations: [], queries: [] },
      region: { id: "reg-sk" },
      visibleProductIds: ["prod-1", "prod-2"],
    })
    mocks.readRequiredPublicEntitySlugs.mockResolvedValue({
      kind: "found",
      value: { "prod-1": "product-one", "prod-2": "product-two" },
    })
    mocks.resolveFlowPublicPage.mockImplementation(async (_context, input) =>
      input.loadSource("sk")
    )
  })

  it("resolves only visible product projections during SSR", async () => {
    await getServerSideProps({
      query: { q: "herbs" },
      req: { headers: { cookie: "cart=token" } },
    } as never)

    expect(mocks.readRequiredPublicEntitySlugs.mock.calls).toEqual([
      [
        {
          kind: "product",
          market: "sk",
          requiredSourceIds: ["prod-1", "prod-2"],
        },
      ],
    ])
  })

  it("fails closed when a visible product projection is unavailable", async () => {
    mocks.readRequiredPublicEntitySlugs.mockResolvedValue({
      causeCode: "MISSING_PRODUCT_PUBLIC_PROJECTION",
      kind: "invalid-response",
    })

    await expect(
      getServerSideProps({
        query: { q: "herbs" },
        req: { headers: {} },
      } as never)
    ).resolves.toEqual({
      causeCode: "MISSING_PRODUCT_PUBLIC_PROJECTION",
      kind: "invalid-response",
    })
  })
})
