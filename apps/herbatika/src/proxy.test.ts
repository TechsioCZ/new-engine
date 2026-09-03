import "next/dist/server/node-environment-baseline"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { config, proxy } from "./proxy"

const ROUTING_ENVIRONMENT = {
  ALLOWED_MARKETS: "sk,cz,hu,ro",
  MARKET_ACCEPTED_HOSTS_CZ:
    "herbatica.cz,www.herbatica.cz,test-engine-herbatika-cz-zane.web-revolution.cz",
  MARKET_ACCEPTED_HOSTS_HU:
    "herbatica.hu,www.herbatica.hu,test-engine-herbatika-hu-zane.web-revolution.cz",
  MARKET_ACCEPTED_HOSTS_RO:
    "herbatica.ro,www.herbatica.ro,test-engine-herbatika-ro-zane.web-revolution.cz",
  MARKET_ACCEPTED_HOSTS_SK:
    "herbatica.sk,www.herbatica.sk,test-engine-herbatika-sk-zane.web-revolution.cz,test-engine-herbatika-zane.web-revolution.cz",
  URL_ARCHITECTURE_ENABLED: "1",
} as const

const originalRoutingEnvironment = Object.fromEntries(
  Object.keys(ROUTING_ENVIRONMENT).map((key) => [key, process.env[key]])
)

const HOST_MATRIX = [
  ["herbatica.sk", "sk", "https://herbatica.sk"],
  ["www.herbatica.sk", "sk", "https://herbatica.sk"],
  [
    "test-engine-herbatika-sk-zane.web-revolution.cz",
    "sk",
    "https://herbatica.sk",
  ],
  [
    "test-engine-herbatika-zane.web-revolution.cz",
    "sk",
    "https://herbatica.sk",
  ],
  ["herbatica.cz", "cz", "https://herbatica.cz"],
  ["www.herbatica.cz", "cz", "https://herbatica.cz"],
  [
    "test-engine-herbatika-cz-zane.web-revolution.cz",
    "cz",
    "https://herbatica.cz",
  ],
  ["herbatica.hu", "hu", "https://herbatica.hu"],
  ["www.herbatica.hu", "hu", "https://herbatica.hu"],
  [
    "test-engine-herbatika-hu-zane.web-revolution.cz",
    "hu",
    "https://herbatica.hu",
  ],
  ["herbatica.ro", "ro", "https://herbatica.ro"],
  ["www.herbatica.ro", "ro", "https://herbatica.ro"],
  [
    "test-engine-herbatika-ro-zane.web-revolution.cz",
    "ro",
    "https://herbatica.ro",
  ],
] as const

const request = (pathname: string, host = "herbatica.sk", method = "GET") =>
  new NextRequest(`https://${host}${pathname}`, {
    headers: { host },
    method,
  })

beforeEach(() => {
  Object.assign(process.env, ROUTING_ENVIRONMENT)
})

afterEach(() => {
  for (const [key, value] of Object.entries(originalRoutingEnvironment)) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key)
    } else {
      process.env[key] = value
    }
  }
})

describe("public proxy adapter", () => {
  it("routes all public HTML through one full-architecture matcher", () => {
    expect(config.matcher).toEqual([
      "/((?!api(?:/|$)|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2)$).*)",
    ])
  })

  it("rewrites a canonical product path with trusted market context", () => {
    const response = proxy(
      request("/termekek/zold-tea?variant=variant_01", "herbatica.hu")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://herbatica.hu/~sf/hu/products/zold-tea?variant=variant_01"
    )
    expect(response.headers.get("x-middleware-request-x-sf-market")).toBe("hu")
    expect(response.headers.get("x-middleware-request-x-sf-route-key")).toBe(
      "product.detail"
    )
    expect(response.headers.get("x-middleware-request-x-sf-public-path")).toBe(
      "/termekek/zold-tea"
    )
  })

  it.each(
    HOST_MATRIX
  )("leaves public routing disabled for accepted host %s when the production flag is 0", (host) => {
    process.env.URL_ARCHITECTURE_ENABLED = "0"

    const response = proxy(request("/", host))

    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-next")).toBe("1")
    expect(response.headers.has("x-middleware-rewrite")).toBe(false)
  })

  it.each(
    HOST_MATRIX
  )("rewrites accepted host %s when the production flag is 1", (host, market) => {
    process.env.URL_ARCHITECTURE_ENABLED = "1"

    const response = proxy(request("/", host))

    expect(response.status).toBe(200)
    expect(response.headers.has("x-middleware-rewrite")).toBe(true)
    expect(response.headers.get("x-middleware-request-x-sf-market")).toBe(
      market
    )
  })

  it("still rejects an unknown Host when production routing is enabled", () => {
    process.env.URL_ARCHITECTURE_ENABLED = "1"

    expect(proxy(request("/", "unknown.example")).status).toBe(421)
  })

  it("scrubs spoofed storefront context from a product rewrite", () => {
    const spoofedRequest = new NextRequest(
      "https://herbatica.ro/produse/ceai-verde",
      {
        headers: {
          host: "herbatica.ro",
          rsc: "1",
          "x-sf-market": "sk",
          "x-sf-route-key": "attacker-controlled",
        },
      }
    )

    const response = proxy(spoofedRequest)

    expect(response.headers.has("x-middleware-request-rsc")).toBe(false)
    expect(response.headers.get("x-middleware-request-x-sf-market")).toBe("ro")
    expect(response.headers.get("x-middleware-request-x-sf-route-key")).toBe(
      "product.detail"
    )
  })

  it("preserves the raw query while rewriting a trusted market host", () => {
    const response = proxy(
      request("/produkty/zeleny-caj?variant=SKU-AbC-01", "herbatica.cz")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://herbatica.cz/~sf/cz/products/zeleny-caj?variant=SKU-AbC-01"
    )
  })

  it.each(
    HOST_MATRIX
  )("recognizes accepted host %s as %s with the canonical origin", (host, market, canonicalOrigin) => {
    const response = proxy(request("/", host))

    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-request-x-sf-market")).toBe(
      market
    )
    expect(
      response.headers.get("x-middleware-request-x-sf-canonical-origin")
    ).toBe(canonicalOrigin)
  })

  it("permanently redirects a legacy official category path and keeps the query", () => {
    const response = proxy(
      request("/kategorie/vlasy_vypadavanie_lupiny?page=2", "herbatica.sk")
    )

    expect(response.status).toBe(308)
    expect(response.headers.get("location")).toBe(
      "https://herbatica.sk/kategorie/podpora-a-rast-vlasov?page=2"
    )
    expect(response.headers.get("x-middleware-rewrite")).toBeNull()
  })

  it("keeps the normalized adapter origin for an internal rewrite", () => {
    const standaloneRequest = new NextRequest(
      "http://127.0.0.1:32145/produkty/zeleny-caj",
      { headers: { host: "herbatica.sk" } }
    )

    expect(proxy(standaloneRequest).headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:32145/~sf/sk/products/zeleny-caj"
    )
  })

  it("scrubs spoofed router and storefront-internal request headers", () => {
    const spoofedRequest = new NextRequest(
      "https://herbatica.sk/produkty/zeleny-caj",
      {
        headers: {
          host: "herbatica.sk",
          "next-router-prefetch": "1",
          "next-router-state-tree": "%5B%22%22%5D",
          rsc: "1",
          "x-market-code": "attacker-controlled",
          "x-nextjs-data": "1",
          "x-sf-market": "attacker-controlled",
        },
      }
    )

    const response = proxy(spoofedRequest)
    const overridden = new Set(
      response.headers
        .get("x-middleware-override-headers")
        ?.split(",")
        .filter(Boolean)
    )

    expect(overridden.has("host")).toBe(true)
    expect(overridden.has("rsc")).toBe(false)
    expect(overridden.has("next-router-prefetch")).toBe(false)
    expect(overridden.has("next-router-state-tree")).toBe(false)
    expect(overridden.has("x-nextjs-data")).toBe(false)
    expect(overridden.has("x-market-code")).toBe(false)
    expect(overridden.has("x-sf-market")).toBe(true)
    expect(response.headers.has("x-middleware-request-rsc")).toBe(false)
    expect(response.headers.get("x-middleware-request-x-sf-market")).toBe("sk")
    expect(
      response.headers.get("x-middleware-request-x-sf-canonical-origin")
    ).toBe("https://herbatica.sk")
    expect(response.headers.get("x-middleware-request-x-sf-route-key")).toBe(
      "product.detail"
    )
    expect(response.headers.get("x-middleware-request-x-sf-public-path")).toBe(
      "/produkty/zeleny-caj"
    )
  })

  it.each([
    ["OPTIONS", 204],
    ["POST", 405],
    ["PUT", 405],
    ["PATCH", 405],
    ["DELETE", 405],
  ])("returns the public page method outcome for %s", (method, status) => {
    const response = proxy(request("/produkty/zeleny-caj", undefined, method))

    expect(response.status).toBe(status)
    expect(response.headers.get("allow")).toBe("GET, HEAD")
    expect(response.headers.has("x-middleware-rewrite")).toBe(false)
  })

  it("returns 421 for an unknown host", () => {
    expect(proxy(request("/", "unknown.example")).status).toBe(421)
  })

  it("does not trust x-forwarded-host when the public Host is unknown", () => {
    const spoofedRequest = new NextRequest("https://unknown.example/", {
      headers: {
        host: "unknown.example",
        "x-forwarded-host": "herbatica.sk",
      },
    })

    expect(proxy(spoofedRequest).status).toBe(421)
  })

  it.each([
    "/~sf/sk/products/x",
    "/_next/data/build-123/~sf/sk/products/x.json",
  ])("never exposes the internal Pages namespace: %s", (pathname) => {
    expect(proxy(request(pathname)).status).toBe(404)
  })

  it.each([
    "/p",
    "/p/legacy",
    "/c",
    "/c/legacy",
  ])("delegates an unknown legacy route to URL Registry: %s", (pathname) => {
    const response = proxy(request(pathname))

    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      `https://herbatica.sk/~sf/sk/url-registry${pathname}`
    )
    expect(response.headers.get("x-middleware-request-x-sf-route-key")).toBe(
      "url-registry.resolve"
    )
  })

  it("passes a verified-host system route through and rejects an unknown host", () => {
    expect(proxy(request("/robots.txt")).headers.get("x-middleware-next")).toBe(
      "1"
    )
    expect(proxy(request("/favicon.ico", "unknown.example")).status).toBe(421)
  })

  it.each([
    ["herbatica.hu", "hu"],
    ["herbatica.ro", "ro"],
  ])("delegates the legacy about path on %s to URL Registry", (host, market) => {
    const response = proxy(request("/o-nas", host))

    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      `https://${host}/~sf/${market}/url-registry/o-nas`
    )
    expect(response.headers.get("x-middleware-request-x-sf-route-key")).toBe(
      "url-registry.resolve"
    )
    expect(response.headers.has("location")).toBe(false)
  })
})
