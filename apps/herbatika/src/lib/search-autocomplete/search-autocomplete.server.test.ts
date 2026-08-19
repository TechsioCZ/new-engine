import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  readRequiredPublicEntitySlugs: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/storefront/market-sdk.server", () => ({
  getMarketStorefrontSdk: () => ({ sdk: { client: { fetch: mocks.fetch } } }),
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
}))

import { fetchSearchAutocomplete } from "./search-autocomplete.server"

describe("search autocomplete URL projections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetch.mockResolvedValue({
      brands: [{ id: "brand-1", title: "Brand" }],
      categories: [{ id: "cat-1", name: "Category" }],
      content: [
        { id: "article-1", title: "Article", type: "article" },
        { id: "page-1", title: "Page", type: "page" },
        { id: "ignored-1", title: "Ignored", type: "campaign" },
      ],
      products: [
        { id: "prod-1", title: "Product" },
        { id: "prod-1", title: "Duplicate product" },
      ],
    })
    mocks.readRequiredPublicEntitySlugs.mockImplementation(
      async ({
        requiredSourceIds,
      }: {
        requiredSourceIds: readonly string[]
      }) => ({
        kind: "found",
        value: Object.fromEntries(
          requiredSourceIds.map((sourceId) => [sourceId, `${sourceId}-slug`])
        ),
      })
    )
  })

  it("fetches candidates first and resolves only their stable source IDs", async () => {
    const response = await fetchSearchAutocomplete({
      currencyCode: "EUR",
      market: "sk",
      query: "herbs",
    })

    expect(response.products).toHaveLength(2)
    expect(mocks.fetch.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.readRequiredPublicEntitySlugs.mock.invocationCallOrder[0] ?? 0
    )
    expect(mocks.readRequiredPublicEntitySlugs.mock.calls).toEqual([
      [{ kind: "product", market: "sk", requiredSourceIds: ["prod-1"] }],
      [{ kind: "category", market: "sk", requiredSourceIds: ["cat-1"] }],
      [{ kind: "brand", market: "sk", requiredSourceIds: ["brand-1"] }],
      [{ kind: "article", market: "sk", requiredSourceIds: ["article-1"] }],
      [{ kind: "page", market: "sk", requiredSourceIds: ["page-1"] }],
    ])
  })

  it("uses bounded empty projection requests when there are no candidates", async () => {
    mocks.fetch.mockResolvedValueOnce({})

    await fetchSearchAutocomplete({
      currencyCode: "EUR",
      market: "sk",
      query: "herbs",
    })

    expect(mocks.readRequiredPublicEntitySlugs).toHaveBeenCalledTimes(5)
    for (const [requirement] of mocks.readRequiredPublicEntitySlugs.mock
      .calls) {
      expect(requirement.requiredSourceIds).toEqual([])
    }
  })
})
