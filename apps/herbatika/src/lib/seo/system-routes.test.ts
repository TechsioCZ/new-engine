import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type {
  MarketRuntime,
  MarketRuntimeBinding,
} from "@/lib/market/market-runtime"

const SENSITIVE_AUTHORITY_PATTERN = /pk_|pkid_|reg_|sc_|token/i

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

const skBinding = {
  acceptedHosts: ["herbatika.sk"],
  canonicalOrigin: "https://herbatika.sk",
  countryCode: "SK",
  locale: "sk-SK",
  market: "sk",
  publishableApiKey: "pk_sk",
  publishableApiKeyId: "pkid_sk",
  regionId: "reg_sk",
  salesChannelId: "sc_sk",
} as const satisfies MarketRuntimeBinding

const huBinding = {
  acceptedHosts: ["herbatika.hu"],
  canonicalOrigin: "https://herbatika.hu",
  countryCode: "HU",
  locale: "hu-HU",
  market: "hu",
  publishableApiKey: "pk_hu",
  publishableApiKeyId: "pkid_hu",
  regionId: "reg_hu",
  salesChannelId: "sc_hu",
} as const satisfies MarketRuntimeBinding

const roBinding = {
  acceptedHosts: ["herbatika.ro"],
  canonicalOrigin: "https://herbatika.ro",
  countryCode: "RO",
  locale: "ro-RO",
  market: "ro",
  publishableApiKey: "pk_ro",
  publishableApiKeyId: "pkid_ro",
  regionId: "reg_ro",
  salesChannelId: "sc_ro",
} as const satisfies MarketRuntimeBinding

const runtime = {
  allowedMarkets: ["sk", "cz", "hu", "ro"],
  bindings: { cz: binding, hu: huBinding, ro: roBinding, sk: skBinding },
  marketByHost: {
    "herbatica.cz": "cz",
    "herbatica.hu": "hu",
    "herbatica.ro": "ro",
    "herbatica.sk": "sk",
  },
} as const satisfies MarketRuntime

const bindingByHost = {
  "herbatica.cz": binding,
  "herbatica.hu": huBinding,
  "herbatica.ro": roBinding,
  "herbatica.sk": skBinding,
} as const

const resolveSystemHostFromRequest = vi.fn((request: Request) => {
  const host = request.headers.get("host") as keyof typeof bindingByHost
  const resolvedBinding = bindingByHost[host]
  return resolvedBinding
    ? ({ binding: resolvedBinding, kind: "found" } as const)
    : ({ kind: "unknown-host" } as const)
})
const checkUrlRegistryHealth = vi.fn().mockResolvedValue(true)
const getConfiguredMarketRuntime = vi.fn(() => runtime)
const countEntities = vi.fn().mockResolvedValue({ kind: "found", value: 0 })
const listEntities = vi.fn().mockResolvedValue({ kind: "found", value: [] })
const validateEntitySources = vi
  .fn()
  .mockResolvedValue({ kind: "found", value: [] })

vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRuntime,
}))

vi.mock("@/lib/seo/system-runtime.server", () => ({
  checkUrlRegistryHealth,
  resolveSystemHostFromRequest,
  systemProductFeedDependencies: {
    listProducts: vi.fn().mockResolvedValue({ kind: "found", value: [] }),
    readProducts: vi.fn(),
    validateProducts: vi.fn(),
  },
  systemSitemapDependencies: {
    countEntities,
    listEntities,
    listStatic: vi.fn().mockResolvedValue({ kind: "found", value: [] }),
    validateHomepageSource: vi
      .fn()
      .mockResolvedValue({ kind: "found", value: true }),
    validateEntitySources,
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
    checkUrlRegistryHealth.mockResolvedValue(true)
    getConfiguredMarketRuntime.mockClear()
    countEntities.mockReset()
    countEntities.mockResolvedValue({ kind: "found", value: 0 })
    listEntities.mockReset()
    listEntities.mockResolvedValue({ kind: "found", value: [] })
    validateEntitySources.mockReset()
    validateEntitySources.mockResolvedValue({ kind: "found", value: [] })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
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
    expect(countEntities).toHaveBeenCalledTimes(6)
    expect(listEntities).not.toHaveBeenCalled()
    expect(validateEntitySources).not.toHaveBeenCalled()

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

  it("builds a 20k-product index from one count per kind and zero product reads", async () => {
    countEntities.mockImplementation(({ kind }) =>
      Promise.resolve({ kind: "found", value: kind === "product" ? 20_000 : 0 })
    )
    const indexRoute = await import("@/app/sitemap.xml/route")

    const response = await indexRoute.GET(makeRequest("/sitemap.xml"))
    const xml = await response.text()

    expect(response.status).toBe(200)
    expect(xml).toContain("https://herbatica.cz/sitemaps/product-200.xml")
    expect(xml).not.toContain("https://herbatica.cz/sitemaps/product-201.xml")
    expect(countEntities).toHaveBeenCalledTimes(6)
    expect(listEntities).not.toHaveBeenCalled()
    expect(validateEntitySources).not.toHaveBeenCalled()
  })

  it("serves a valid empty urlset for an advertised source-filtered shard", async () => {
    countEntities.mockImplementation(({ kind }) =>
      Promise.resolve({ kind: "found", value: kind === "product" ? 1 : 0 })
    )
    const shardRoute = await import("@/app/sitemaps/[shard]/route")

    const response = await shardRoute.GET(
      makeRequest("/sitemaps/product-1.xml"),
      { params: Promise.resolve({ shard: "product-1.xml" }) }
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"></urlset>\n'
    )
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

  it("keeps the public health endpoint minimal and independent of dependencies", async () => {
    const { GET, HEAD, OPTIONS } = await import("@/app/api/healthz/route")
    const response = await GET(makeRequest("/api/healthz"))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "ok" })
    expect(getConfiguredMarketRuntime).not.toHaveBeenCalled()
    expect(checkUrlRegistryHealth).not.toHaveBeenCalled()
    const head = await HEAD(makeRequest("/api/healthz", "herbatica.hu"))
    expect(head.status).toBe(200)
    expect(await head.text()).toBe("")
    expect(OPTIONS().headers.get("allow")).toBe("GET, HEAD, POST")
    expect(
      (await GET(makeRequest("/api/healthz", "unknown.example"))).status
    ).toBe(421)
  })

  it("checks exactly SK, CZ, HU, and RO on the authenticated readiness projection", async () => {
    vi.stubEnv(
      "HERBATIKA_READINESS_TOKEN",
      "readiness-token-with-at-least-32-characters"
    )
    const { POST } = await import("@/app/api/healthz/route")
    const response = await POST(
      new Request("https://internal/api/healthz", {
        headers: {
          authorization: "Bearer readiness-token-with-at-least-32-characters",
          host: "herbatica.cz",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      markets: {
        cz: { status: "ok" },
        hu: { status: "ok" },
        ro: { status: "ok" },
        sk: { status: "ok" },
      },
      status: "ok",
    })
    expect(checkUrlRegistryHealth.mock.calls.map(([value]) => value)).toEqual([
      skBinding,
      binding,
      huBinding,
      roBinding,
    ])
  })

  it("attributes readiness failure by market without leaking runtime authority", async () => {
    vi.stubEnv(
      "HERBATIKA_READINESS_TOKEN",
      "readiness-token-with-at-least-32-characters"
    )
    checkUrlRegistryHealth.mockImplementation(async (marketBinding) =>
      Promise.resolve(marketBinding.market !== "hu")
    )
    const { POST } = await import("@/app/api/healthz/route")
    const response = await POST(
      new Request("https://internal/api/healthz", {
        headers: {
          authorization: "Bearer readiness-token-with-at-least-32-characters",
          host: "herbatica.cz",
        },
        method: "POST",
      })
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({
      markets: {
        cz: { status: "ok" },
        hu: { status: "unavailable" },
        ro: { status: "ok" },
        sk: { status: "ok" },
      },
      status: "unavailable",
    })
    expect(JSON.stringify(body)).not.toMatch(SENSITIVE_AUTHORITY_PATTERN)
  })

  it("does not expose readiness details without dedicated authorization", async () => {
    vi.stubEnv(
      "HERBATIKA_READINESS_TOKEN",
      "readiness-token-with-at-least-32-characters"
    )
    const { POST } = await import("@/app/api/healthz/route")
    const response = await POST(
      new Request("https://internal/api/healthz", {
        headers: { host: "herbatica.cz" },
        method: "POST",
      })
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ status: "unauthorized" })
    expect(getConfiguredMarketRuntime).not.toHaveBeenCalled()
    expect(checkUrlRegistryHealth).not.toHaveBeenCalled()
  })
})
