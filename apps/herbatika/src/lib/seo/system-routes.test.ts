import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  MarketRuntime,
  MarketRuntimeBinding,
} from "@/lib/market/market-runtime"

const binding = {
  acceptedHosts: ["herbatica.cz"],
  canonicalOrigin: "https://herbatica.cz",
  countryCode: "CZ",
  locale: "cs-CZ",
  market: "cz",
  publishableApiKey: "pk_cz",
  publishableApiKeyId: "pkid_cz",
  regionId: "reg_cz",
  salesChannelId: "sc_cz",
} as const satisfies MarketRuntimeBinding

const runtime = {
  allowedMarkets: ["cz"],
  bindings: { cz: binding },
  marketByHost: { "herbatica.cz": "cz" },
} as const satisfies MarketRuntime

const resolveSystemHostFromRequest = vi.fn((request: Request) =>
  request.headers.get("host") === "herbatica.cz"
    ? ({ binding, kind: "found" } as const)
    : ({ kind: "unknown-host" } as const)
)
const checkUrlRegistryHealth = vi.fn().mockResolvedValue(true)

vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRuntime: () => runtime,
}))

vi.mock("@/lib/seo/system-runtime.server", () => ({
  checkUrlRegistryHealth,
  resolveSystemHostFromRequest,
  systemProductFeedDependencies: {
    listProducts: vi.fn().mockResolvedValue({ kind: "found", value: [] }),
    readProduct: vi.fn(),
  },
  systemSitemapDependencies: {
    listEntities: vi.fn().mockResolvedValue({ kind: "found", value: [] }),
    listStatic: vi.fn().mockResolvedValue({ kind: "found", value: [] }),
    validateEntitySources: vi
      .fn()
      .mockResolvedValue({ kind: "found", value: [] }),
    validateStaticSources: vi
      .fn()
      .mockResolvedValue({ kind: "found", value: [] }),
  },
}))

const makeRequest = (path: string, host = "herbatica.cz") =>
  new Request(`https://internal${path}`, { headers: { host } })

describe("system Route Handlers", () => {
  beforeEach(() => {
    resolveSystemHostFromRequest.mockClear()
    checkUrlRegistryHealth.mockClear()
  })

  it("serves host-specific robots and rejects an unknown authority", async () => {
    const { GET } = await import("@/app/robots.txt/route")
    const response = GET(makeRequest("/robots.txt"))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      "User-agent: *\nAllow: /\nDisallow: /~sf/\nDisallow: /api/\n\nSitemap: https://herbatica.cz/sitemap.xml\n"
    )
    expect(GET(makeRequest("/robots.txt", "unknown.example")).status).toBe(421)
  })

  it("serves a bounded sitemap index and exact one-based shards", async () => {
    const indexRoute = await import("@/app/sitemap.xml/route")
    const indexResponse = await indexRoute.GET(makeRequest("/sitemap.xml"))
    expect(indexResponse.status).toBe(200)
    expect(indexResponse.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
    expect(await indexResponse.text()).toContain(
      "https://herbatica.cz/sitemaps/core-1.xml"
    )

    const shardRoute = await import("@/app/sitemaps/[shard]/route")
    const core = await shardRoute.GET(makeRequest("/sitemaps/core-1.xml"), {
      params: Promise.resolve({ shard: "core-1.xml" }),
    })
    expect(core.status).toBe(200)
    expect(core.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
    expect(await core.text()).toContain("<loc>https://herbatica.cz/</loc>")

    const missing = await shardRoute.GET(makeRequest("/sitemaps/core-2.xml"), {
      params: Promise.resolve({ shard: "core-2.xml" }),
    })
    expect(missing.status).toBe(404)
  })

  it("localizes the manifest and emits an empty complete product feed", async () => {
    const manifestRoute = await import("@/app/manifest.webmanifest/route")
    const manifestResponse = manifestRoute.GET(
      makeRequest("/manifest.webmanifest")
    )
    expect(manifestResponse.status).toBe(200)
    await expect(manifestResponse.json()).resolves.toMatchObject({
      icons: expect.arrayContaining([
        expect.objectContaining({
          src: "https://herbatica.cz/favicon.ico",
          type: "image/x-icon",
        }),
      ]),
      lang: "cs-CZ",
      name: "Herbatika Česko",
      start_url: "https://herbatica.cz/",
    })

    const feedRoute = await import("@/app/feeds/products.xml/route")
    const feedResponse = await feedRoute.GET(makeRequest("/feeds/products.xml"))
    expect(feedResponse.status).toBe(200)
    expect(feedResponse.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
    expect(await feedResponse.text()).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<SHOP></SHOP>\n'
    )
  })

  it("serves the favicon only for a verified authority", async () => {
    const { GET } = await import("@/app/favicon.ico/route")
    const response = await GET(makeRequest("/favicon.ico"))
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/x-icon")
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0)
    expect(
      (await GET(makeRequest("/favicon.ico", "unknown.example"))).status
    ).toBe(421)
  })

  it("fails closed for unregistered well-known resources", async () => {
    const { GET } = await import("@/app/.well-known/[name]/route")
    const context = { params: Promise.resolve({ name: "security.txt" }) }
    expect(
      (await GET(makeRequest("/.well-known/security.txt"), context)).status
    ).toBe(404)
    expect(
      (
        await GET(
          makeRequest("/.well-known/security.txt", "unknown.example"),
          context
        )
      ).status
    ).toBe(421)
  })

  it("checks every configured market on the internal health endpoint", async () => {
    const { GET } = await import("@/app/api/healthz/route")
    const response = await GET(makeRequest("/api/healthz"))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "ok" })
    expect(checkUrlRegistryHealth).toHaveBeenCalledWith(binding)
    expect(
      (await GET(makeRequest("/api/healthz", "unknown.example"))).status
    ).toBe(421)
  })
})
