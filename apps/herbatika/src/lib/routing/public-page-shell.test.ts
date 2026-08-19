import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchCmsFooterNavigation: vi.fn(),
  fetchExternalReviewTrustSources: vi.fn(async () => []),
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
  getHerbatikaMarketContext: vi.fn(() => ({ locale: "sk-SK" })),
  getRegionServerContext: vi.fn(async () => ({
    region: { region_id: "reg-sk" },
  })),
  readRequiredPublicEntitySlugs: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/storefront/cms-footer-navigation", () => ({
  fetchCmsFooterNavigation: mocks.fetchCmsFooterNavigation,
}))
vi.mock("@/lib/storefront/external-reviews.server", () => ({
  fetchExternalReviewTrustSources: mocks.fetchExternalReviewTrustSources,
}))
vi.mock("@/lib/storefront/market-context", () => ({
  getHerbatikaMarketContext: mocks.getHerbatikaMarketContext,
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readRequiredPublicEntitySlugs: mocks.readRequiredPublicEntitySlugs,
}))
vi.mock("@/lib/storefront/ssr/context", () => ({
  getRegionServerContext: mocks.getRegionServerContext,
}))
vi.mock("@/lib/storefront/storefront-texts.server", () => ({
  fetchStorefrontTextMessages: mocks.fetchStorefrontTextMessages,
}))

import { loadPublicErrorShell, loadPublicShell } from "./public-page"

describe("public storefront shell URL projections", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchCmsFooterNavigation.mockResolvedValue({
      columns: [
        {
          items: [{ href: "/ignored", slot: "about", type: "internal" }],
          slot: "information",
        },
      ],
    })
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

  it("loads CMS footer navigation with the trusted market locale", async () => {
    const shell = await loadPublicShell("sk")

    expect(mocks.fetchCmsFooterNavigation).toHaveBeenCalledWith("sk-SK")
    expect(shell.footerNavigation.columns).toHaveLength(1)
  })

  it("passes the server-selected market region into the Pages shell", async () => {
    const shell = await loadPublicShell("sk")

    expect(mocks.getRegionServerContext).toHaveBeenCalledWith({ market: "sk" })
    expect(shell.initialRegion).toEqual({ region_id: "reg-sk" })
  })

  it("fails footer navigation closed without failing the public page", async () => {
    mocks.fetchCmsFooterNavigation.mockRejectedValueOnce(
      new Error("CMS unavailable")
    )

    const shell = await loadPublicShell("sk")

    expect(shell.footerNavigation).toEqual({ columns: [] })
    expect(shell.initialRegion).toEqual({ region_id: "reg-sk" })
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
    expect(shell.footerNavigation).toEqual({ columns: [] })
    expect(shell.initialRegion).toBeNull()
    expect(mocks.fetchCmsFooterNavigation).not.toHaveBeenCalled()
    expect(mocks.readRequiredPublicEntitySlugs).not.toHaveBeenCalled()
  })
})
