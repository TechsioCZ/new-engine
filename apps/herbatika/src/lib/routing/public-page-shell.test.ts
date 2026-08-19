import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchExternalReviewTrustSources: vi.fn(async () => []),
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
  getHerbatikaMarketContext: vi.fn(() => ({ locale: "sk" })),
  readRequiredPublicEntitySlugs: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/storefront/external-reviews.server", () => ({
  fetchExternalReviewTrustSources: mocks.fetchExternalReviewTrustSources,
}))
vi.mock("@/lib/storefront/market-context", () => ({
  getHerbatikaMarketContext: mocks.getHerbatikaMarketContext,
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
}))
vi.mock("@/lib/storefront/storefront-texts.server", () => ({
  fetchStorefrontTextMessages: mocks.fetchStorefrontTextMessages,
}))

import { loadPublicErrorShell, loadPublicShell } from "./public-page"

describe("public storefront shell URL projections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.readRequiredPublicEntitySlugs.mockResolvedValue({
      kind: "found",
      value: { "pcat-herbs": "bylinky" },
    })
  })

  it("loads a market-scoped category projection map for global navigation", async () => {
    const shell = await loadPublicShell("sk")

    expect(mocks.readRequiredPublicEntitySlugs).toHaveBeenCalledWith({
      kind: "category",
      market: "sk",
    })
    expect(shell.categoryPublicSlugsById).toEqual({
      "pcat-herbs": "bylinky",
    })
  })

  it("fails the public shell closed when category projections are incomplete", async () => {
    mocks.readRequiredPublicEntitySlugs.mockResolvedValueOnce({
      kind: "missing",
    })

    await expect(loadPublicShell("sk")).rejects.toThrow(
      "Category URL projections are unavailable"
    )
  })

  it("reuses an already hydrated category map without another URLR read", async () => {
    const categoryPublicSlugsById = { "pcat-teas": "caje" }

    const shell = await loadPublicShell("sk", categoryPublicSlugsById)

    expect(mocks.readRequiredPublicEntitySlugs).not.toHaveBeenCalled()
    expect(shell.categoryPublicSlugsById).toBe(categoryPublicSlugsById)
  })

  it("keeps the error shell link-free", async () => {
    const shell = await loadPublicErrorShell("sk")

    expect(shell.categoryPublicSlugsById).toEqual({})
    expect(mocks.readRequiredPublicEntitySlugs).not.toHaveBeenCalled()
  })
})
