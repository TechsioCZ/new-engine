import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchCmsFooterNavigation: vi.fn(),
  fetchExternalReviewTrustSources: vi.fn(async () => []),
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
  getConfiguredMarketRuntime: vi.fn(() => ({
    allowedMarkets: ["sk", "cz"],
    bindings: {
      cz: {
        acceptedHosts: ["herbatica.cz"],
        canonicalOrigin: "https://herbatica.cz",
        market: "cz",
      },
      sk: {
        acceptedHosts: ["herbatica.sk"],
        canonicalOrigin: "https://herbatica.sk",
        market: "sk",
      },
    },
    marketByHost: {
      "herbatica.cz": "cz",
      "herbatica.sk": "sk",
    },
  })),
  getHerbatikaMarketContext: vi.fn(() => ({ locale: "sk-SK" })),
  getRegionServerContext: vi.fn(async () => ({
    region: {
      country_code: "sk",
      currency_code: "eur",
      name: "Slovakia",
      region_id: "reg-sk",
    },
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
vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRoutingRuntime: mocks.getConfiguredMarketRuntime,
  getConfiguredMarketRuntime: mocks.getConfiguredMarketRuntime,
}))

import {
  loadPublicErrorShell,
  loadPublicShell,
  resolveStaticPublicPage,
} from "./public-page"

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

  it("loads the server-authoritative region for the Pages provider", async () => {
    const shell = await loadPublicShell("sk")

    expect(mocks.getRegionServerContext).toHaveBeenCalledWith({ market: "sk" })
    expect(shell.initialRegion).toEqual({
      country_code: "sk",
      currency_code: "eur",
      name: "Slovakia",
      region_id: "reg-sk",
    })
  })

  it("nests dotted storefront message keys for next-intl", async () => {
    mocks.fetchStorefrontTextMessages.mockResolvedValueOnce({
      "navigation.footer.copyright": "Herbatica",
      "search.input_placeholder": "Search",
    })

    const shell = await loadPublicShell("sk")

    expect(shell.messages).toEqual({
      navigation: { footer: { copyright: "Herbatica" } },
      search: { input_placeholder: "Search" },
    })
  })

  it("fails footer navigation closed without failing the public page", async () => {
    mocks.fetchCmsFooterNavigation.mockRejectedValueOnce(
      new Error("CMS unavailable")
    )

    const shell = await loadPublicShell("sk")

    expect(shell.footerNavigation).toEqual({ columns: [] })
    expect(shell.initialRegion).toMatchObject({ region_id: "reg-sk" })
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

  it.each([
    { causeCode: "MARKET_DISABLED", kind: "invalid-response" as const },
    { kind: "unavailable" as const, retryAfterSeconds: 19 },
  ])("omits a non-current static alternate whose source is $kind", async (alternateFailure) => {
    const response = {
      setHeader: vi.fn(),
      statusCode: 200,
    }
    const context = {
      params: { market: "sk" },
      req: {
        headers: {
          "x-sf-canonical-origin": "https://herbatica.sk",
          "x-sf-market": "sk",
          "x-sf-public-path": "/",
          "x-sf-route-key": "home",
        },
        url: "/",
      },
      res: response,
    } as never
    const loadSource = vi.fn(async (market: "sk" | "cz" | "hu" | "ro") =>
      market === "sk"
        ? ({ kind: "found", value: { title: "Home" } } as const)
        : alternateFailure
    )

    const result = await resolveStaticPublicPage(context, {
      expectedRouteKey: "home",
      loadSource,
      path: { kind: "home" },
      queryKind: "homepage",
    })

    expect(result).toMatchObject({
      props: {
        page: { kind: "found", value: { title: "Home" } },
        seo: {
          alternates: { "sk-SK": "https://herbatica.sk/" },
        },
      },
    })
    expect(loadSource).toHaveBeenCalledTimes(2)
    expect(loadSource).toHaveBeenNthCalledWith(1, "sk")
    expect(loadSource).toHaveBeenNthCalledWith(2, "cz")
  })

  it("omits a rejected non-current static alternate source", async () => {
    const response = {
      setHeader: vi.fn(),
      statusCode: 200,
    }
    const context = {
      params: { market: "sk" },
      req: {
        headers: {
          "x-sf-canonical-origin": "https://herbatica.sk",
          "x-sf-market": "sk",
          "x-sf-public-path": "/",
          "x-sf-route-key": "home",
        },
        url: "/",
      },
      res: response,
    } as never
    const loadSource = vi.fn((market: "sk" | "cz" | "hu" | "ro") =>
      market === "sk"
        ? Promise.resolve({
            kind: "found" as const,
            value: { title: "Home" },
          })
        : Promise.reject(new Error("CZ source transport failed"))
    )

    const result = await resolveStaticPublicPage(context, {
      expectedRouteKey: "home",
      loadSource,
      path: { kind: "home" },
      queryKind: "homepage",
    })

    expect(result).toMatchObject({
      props: {
        page: { kind: "found", value: { title: "Home" } },
        seo: { alternates: { "sk-SK": "https://herbatica.sk/" } },
      },
    })
  })

  it.each([
    { causeCode: "MALFORMED_HOME", kind: "invalid-response" as const },
    { kind: "unavailable" as const, retryAfterSeconds: 19 },
  ])("keeps the current static source $kind failure strict", async (sourceFailure) => {
    const response = {
      setHeader: vi.fn(),
      statusCode: 200,
    }
    const context = {
      params: { market: "sk" },
      req: {
        headers: {
          "x-sf-canonical-origin": "https://herbatica.sk",
          "x-sf-market": "sk",
          "x-sf-public-path": "/",
          "x-sf-route-key": "home",
        },
        url: "/",
      },
      res: response,
    } as never

    const result = await resolveStaticPublicPage(context, {
      expectedRouteKey: "home",
      loadSource: vi.fn(async () => sourceFailure),
      path: { kind: "home" },
      queryKind: "homepage",
    })

    expect(result).toMatchObject({
      props: { page: { kind: "error", status: 503 } },
    })
    expect(response.statusCode).toBe(503)
  })

  it("keeps a rejected current static source strict", async () => {
    const response = {
      setHeader: vi.fn(),
      statusCode: 200,
    }
    const context = {
      params: { market: "sk" },
      req: {
        headers: {
          "x-sf-canonical-origin": "https://herbatica.sk",
          "x-sf-market": "sk",
          "x-sf-public-path": "/",
          "x-sf-route-key": "home",
        },
        url: "/",
      },
      res: response,
    } as never

    const result = await resolveStaticPublicPage(context, {
      expectedRouteKey: "home",
      loadSource: vi.fn(() =>
        Promise.reject(new Error("SK source transport failed"))
      ),
      path: { kind: "home" },
      queryKind: "homepage",
    })

    expect(result).toMatchObject({
      props: { page: { kind: "error", status: 503 } },
    })
    expect(response.statusCode).toBe(503)
  })
})
