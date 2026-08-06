import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it } from "vitest"
import {
  CANONICALIZATION_REQUIRED_HEADER,
  ORIGINAL_PUBLIC_PATH_HEADER,
  TRUSTED_MARKET_HEADER,
} from "@/lib/routing/trusted-headers"
import {
  config,
  createMarketHostBindings,
  type MarketHostBinding,
  normalizeRequestHost,
  parseRequestHost,
  proxy,
  resolveAllowedMarkets,
  resolveMarketFromHost,
  resolveProxyRoute,
  scrubInternalHeaders,
} from "./proxy"

const originalAllowedMarkets = process.env.ALLOWED_MARKETS

const request = (
  pathname: string,
  options: {
    host?: string
    method?: string
    headers?: Record<string, string>
  } = {}
) =>
  new NextRequest(`https://herbatica.cz${pathname}`, {
    method: options.method,
    headers: {
      host: options.host ?? "herbatica.cz",
      ...options.headers,
    },
  })

const forwardedRequestHeader = (response: Response, name: string) =>
  response.headers.get(`x-middleware-request-${name}`)

const passThroughSummary = (response: Response) => ({
  status: response.status,
  next: response.headers.get("x-middleware-next"),
  rewrite: response.headers.get("x-middleware-rewrite"),
  location: response.headers.get("location"),
})

const EXPECTED_PASS_THROUGH = {
  status: 200,
  next: "1",
  rewrite: null,
  location: null,
}

afterEach(() => {
  if (originalAllowedMarkets === undefined) {
    Reflect.deleteProperty(process.env, "ALLOWED_MARKETS")
  } else {
    process.env.ALLOWED_MARKETS = originalAllowedMarkets
  }
})

describe("strict Host authority parsing", () => {
  it("accepts exactly one hostname with an optional numeric port", () => {
    expect(parseRequestHost("HERBATICA.CZ:443")).toEqual({
      hostname: "herbatica.cz",
      port: "443",
    })
    expect(parseRequestHost("herbatica.cz.")).toEqual({
      hostname: "herbatica.cz",
      port: null,
    })
    expect(parseRequestHost("[::1]:3001")).toEqual({
      hostname: "[::1]",
      port: "3001",
    })
    expect(normalizeRequestHost("HERBATICA.CZ:443")).toBe("herbatica.cz")
    expect(parseRequestHost("herbatica.cz\u0000evil")).toBeNull()
  })

  it.each([
    "herbatica.cz,evil.example",
    "https://herbatica.cz",
    "herbatica.cz/path",
    "herbatica.cz\\evil",
    "herbatica .cz",
    "herbatica.cz:abc",
    "herbatica.cz:",
    "herbatica.cz:65536",
    "herbatica.cz:000080",
    "[::1",
    "::1",
  ])("rejects malformed or ambiguous authority %s", (host) => {
    expect(parseRequestHost(host)).toBeNull()
    expect(proxy(request("/produkty", { host })).status).toBe(421)
  })

  it("returns 421 for a well-formed unknown host", () => {
    expect(parseRequestHost("unknown.example")).not.toBeNull()
    expect(
      proxy(request("/produkty", { host: "unknown.example" })).status
    ).toBe(421)
  })
})

describe("runtime market host bindings", () => {
  it("resolves only hosts in the runtime allowed market subset", () => {
    process.env.ALLOWED_MARKETS = "cz,hu"
    const bindings = createMarketHostBindings(process.env)

    expect(resolveMarketFromHost("HERBATICA.CZ:443", bindings)?.market).toBe(
      "cz"
    )
    expect(resolveMarketFromHost("herbatica.sk", bindings)).toBeNull()
    expect(resolveMarketFromHost("unknown.example", bindings)).toBeNull()
  })

  it("ignores invalid ALLOWED_MARKETS entries without falling back", () => {
    expect(resolveAllowedMarkets("xx,ro")).toEqual(new Set(["ro"]))
    expect(resolveAllowedMarkets("xx")).toEqual(new Set())
  })

  it("fails closed when the same accepted host belongs to two markets", () => {
    const bindings: MarketHostBinding[] = [
      {
        market: "cz",
        canonicalHost: "herbatica.cz",
        acceptedHosts: new Set(["shared.example"]),
      },
      {
        market: "sk",
        canonicalHost: "herbatica.sk",
        acceptedHosts: new Set(["shared.example"]),
      },
    ]
    expect(resolveMarketFromHost("shared.example", bindings)).toBeNull()
  })
})

describe("static public path recognition", () => {
  it("recognizes localized entity details without producing internal targets", () => {
    expect(resolveProxyRoute("hu", "/TERMEKEK/ZOLD-TEA/")).toEqual({
      type: "entity",
      kind: "product",
      isDetail: true,
      normalizedPath: "/termekek/zold-tea",
    })
    expect(
      JSON.stringify(resolveProxyRoute("hu", "/termekek/zold-tea"))
    ).not.toContain("~sf")
  })

  it("recognizes registry-backed page, flow, and system shapes", () => {
    expect(resolveProxyRoute("ro", "/INFORMATII/CONTACT")).toEqual({
      type: "entity",
      kind: "page",
      isDetail: true,
      normalizedPath: "/informatii/contact",
    })
    expect(resolveProxyRoute("ro", "/cont/comenzi/Order-ABC")).toEqual({
      type: "flow",
      kind: "account",
      normalizedPath: "/cont/comenzi/Order-ABC",
    })
    expect(resolveProxyRoute("sk", "/recenzie/produkt/Token-AbC")).toEqual({
      type: "flow",
      kind: "reviews",
      normalizedPath: "/recenzie/produkt/Token-AbC",
    })
    expect(resolveProxyRoute("cz", "/ucet/obnova-hesla/Token-AbC")).toEqual({
      type: "flow",
      kind: "account",
      normalizedPath: "/ucet/obnova-hesla/Token-AbC",
    })
    expect(resolveProxyRoute("cz", "/SITEMAPS/PRODUCT-1.XML/")).toEqual({
      type: "system",
      normalizedPath: "/sitemaps/product-1.xml",
    })
  })

  it.each([
    "/%",
    "/%zz",
    "/produkty%2Fzeleny-caj",
    "/produkty%5Czeleny-caj",
  ])("classifies malformed or separator-decoding path %s as a bad request", (pathname) => {
    expect(resolveProxyRoute("cz", pathname)).toEqual({
      type: "bad-request",
    })
  })

  it.each([
    "/sk/product/example",
    "/~sf/cz/product/example",
    "/%7Esf/cz/product/example",
    "/not-a-route",
    "/contact",
    "/produkty/a/b",
    "/produkty/not_valid",
    "/kosik/extra",
    "/pokladna/not-a-step",
    "/sitemaps/not-a-shard.xml/extra",
    "/health",
  ])("blocks direct internal or invalid public path %s", (pathname) => {
    expect(resolveProxyRoute("cz", pathname)).toEqual({ type: "not-found" })
  })
})

describe("proxy ingress behavior", () => {
  it("passes public detail URLs through with trusted context and no rewrite", () => {
    const response = proxy(
      request("/PRODUKTY/Green-Tea/?varianta=100", {
        headers: {
          "x-sf-market": "sk",
          "x-sf-custom": "evil",
          "x-market-code": "sk",
        },
      })
    )

    expect(passThroughSummary(response)).toEqual(EXPECTED_PASS_THROUGH)
    expect(forwardedRequestHeader(response, TRUSTED_MARKET_HEADER)).toBe("cz")
    expect(forwardedRequestHeader(response, ORIGINAL_PUBLIC_PATH_HEADER)).toBe(
      "/PRODUKTY/Green-Tea/"
    )
    expect(
      forwardedRequestHeader(response, CANONICALIZATION_REQUIRED_HEADER)
    ).toBe("1")
    expect(forwardedRequestHeader(response, "x-sf-custom")).toBeNull()
    expect(forwardedRequestHeader(response, "x-market-code")).toBeNull()
  })

  it("passes canonical public index and system paths without rewrites", () => {
    for (const pathname of [
      "/produkty",
      "/robots.txt",
      "/sitemap.xml",
      "/sitemaps/product-1.xml",
    ]) {
      const response = proxy(request(pathname))
      expect(passThroughSummary(response)).toEqual(EXPECTED_PASS_THROUGH)
      expect(forwardedRequestHeader(response, TRUSTED_MARKET_HEADER)).toBe("cz")
    }
  })

  it("accepts Next Link RSC cache keys without making them public query keys", () => {
    for (const pathname of [
      "/produkty?_rsc=index-cache-key",
      "/produkty/green-tea?varianta=SKU-1&_rsc=detail-cache-key",
    ]) {
      const response = proxy(request(pathname, { headers: { rsc: "1" } }))
      expect(passThroughSummary(response)).toEqual(EXPECTED_PASS_THROUGH)
    }

    expect(proxy(request("/produkty?_rsc=public-value")).status).toBe(400)
  })

  it("strips the internal RSC key from canonical redirects", () => {
    const response = proxy(
      request("/PRODUKTY/?_rsc=cache-key", { headers: { rsc: "1" } })
    )
    expect(response.status).toBe(308)
    expect(response.headers.get("location")).toBe(
      "https://herbatica.cz/produkty"
    )
  })

  it("uses one static 308 for index, flow, and system normalization", () => {
    for (const [source, expected] of [
      ["/PRODUKTY/", "https://herbatica.cz/produkty"],
      ["/KOSIK/", "https://herbatica.cz/kosik"],
      ["/ROBOTS.TXT/", "https://herbatica.cz/robots.txt"],
    ]) {
      const response = proxy(request(source))
      expect(response.status).toBe(308)
      expect(response.headers.get("location")).toBe(expected)
      expect(response.headers.get("x-middleware-rewrite")).toBeNull()
    }
  })

  it("redirects an accepted alias host to the canonical host for index pages", () => {
    const previous = process.env.HERBATICA_ALLOWED_HOSTS_CZ
    process.env.HERBATICA_ALLOWED_HOSTS_CZ = "shop.example"
    try {
      const response = proxy(request("/produkty", { host: "shop.example" }))
      expect(response.status).toBe(308)
      expect(response.headers.get("location")).toBe(
        "https://herbatica.cz/produkty"
      )
      expect(response.headers.get("x-middleware-rewrite")).toBeNull()
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, "HERBATICA_ALLOWED_HOSTS_CZ")
      } else {
        process.env.HERBATICA_ALLOWED_HOSTS_CZ = previous
      }
    }
  })

  it.each([
    "/%zz",
    "/produkty%2Fzeleny-caj",
    "/produkty%5Czeleny-caj",
  ])("returns a static 400 for malformed path %s", (pathname) => {
    const response = proxy(request(pathname))
    expect(response.status).toBe(400)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("x-middleware-rewrite")).toBeNull()
  })

  it("enforces entity queries by route shape", () => {
    for (const pathname of [
      "/produkty/zeleny-caj?varianta=SKU-1&reviews_page=2",
      "/kategorie/caje?strana=2&razeni=price-asc&znacka=pukka",
      "/kategorie/caje?page=2&sort=price-asc&brand=pukka",
      "/poradna?tema=fitness&strana=2",
    ]) {
      expect(proxy(request(pathname)).status).toBe(200)
    }

    for (const pathname of [
      "/produkty?varianta=SKU-1",
      "/produkty/zeleny-caj?not-allowed=1",
      "/produkty/zeleny-caj?varianta=SKU-1&varianta=SKU-2",
      "/kategorie/caje?strana=0",
      "/poradna/clanek?tema=fitness",
      "/informace/kontakt?strana=2",
    ]) {
      expect(proxy(request(pathname)).status).toBe(400)
    }
  })

  it("enforces flow-specific query contracts", () => {
    for (const pathname of [
      "/vyhledavani?q=caj&page=2&sort=price-asc&status=in-stock&brand=pukka",
      "/vyhledavani?q=caj&strana=2&razeni=price-asc&znacka=pukka",
      "/ucet/objednavky?page=2",
      "/ucet/seznamy?list=list_1",
      "/ucet/prihlaseni?next=%2Fucet",
      "/ucet/obnova-hesla?token=Token-AbC&email=a%40example.com&flow=reset-password",
      "/recenze/produkt/Token-AbC?product_id=prod_1",
      "/pokladna/navrat-z-platby?cart_id=cart_1&provider_id=pp_test&payment_cancelled=true",
    ]) {
      expect(proxy(request(pathname)).status).toBe(200)
    }

    for (const pathname of [
      "/?q=caj",
      "/kosik?q=caj",
      "/vyhledavani?q=caj&q=tea",
      "/vyhledavani?q=caj&page=01",
      "/vyhledavani?q=caj&sort=PRICE-ASC",
      "/ucet/objednavky?q=caj",
      "/pokladna/kontakt?cart_id=cart_1",
      "/pokladna/navrat-z-platby?cart_id=cart_1&utm_source=x",
    ]) {
      expect(proxy(request(pathname)).status).toBe(400)
    }
  })

  it("keeps an allowed query through path canonicalization", () => {
    const response = proxy(request("/VYHLEDAVANI/?q=Green+Tea"))
    expect(response.status).toBe(308)
    expect(response.headers.get("location")).toBe(
      "https://herbatica.cz/vyhledavani?q=Green+Tea"
    )
  })

  it("does not redirect unsupported public HTML methods", () => {
    const response = proxy(request("/PRODUKTY/Green-Tea/", { method: "POST" }))
    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("GET, HEAD")
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("x-middleware-rewrite")).toBeNull()
  })

  it("scrubs API spoofing and injects only the Host-derived market", () => {
    const response = proxy(
      request("/api/storefront-auth/session", {
        method: "POST",
        headers: {
          "x-sf-market": "sk",
          "x-sf-public-path": "/~sf/sk/home",
          "x-sf-custom": "evil",
        },
      })
    )

    expect(passThroughSummary(response)).toEqual(EXPECTED_PASS_THROUGH)
    expect(forwardedRequestHeader(response, TRUSTED_MARKET_HEADER)).toBe("cz")
    expect(forwardedRequestHeader(response, ORIGINAL_PUBLIC_PATH_HEADER)).toBe(
      "/api/storefront-auth/session"
    )
    expect(forwardedRequestHeader(response, "x-sf-custom")).toBeNull()
  })

  it("includes all API ingress while retaining Next static/image exclusions", () => {
    expect(
      unstable_doesMiddlewareMatch({ config, url: "/api/export/report.css" })
    ).toBe(true)
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url: "/_next/static/chunks/app.js",
      })
    ).toBe(false)
    expect(
      unstable_doesMiddlewareMatch({ config, url: "/_next/image?url=logo.png" })
    ).toBe(false)
  })
})

describe("header scrubbing helper", () => {
  it("removes every client-provided internal header", () => {
    const headers = new Headers({
      accept: "text/html",
      "x-canonical-origin": "https://evil.example",
      "x-market-code": "sk",
      "x-sales-channel-id": "sc_evil",
      "x-sf-market": "sk",
      "x-sf-custom": "evil",
    })

    const scrubbed = scrubInternalHeaders(headers)
    expect(Object.fromEntries(scrubbed)).toEqual({ accept: "text/html" })
  })
})
