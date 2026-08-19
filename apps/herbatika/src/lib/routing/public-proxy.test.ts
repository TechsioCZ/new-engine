import { describe, expect, it } from "vitest"
import { resolvePublicProxyAction } from "./public-proxy"

const resolve = (
  pathname: string,
  overrides: Partial<Parameters<typeof resolvePublicProxyAction>[0]> = {}
) =>
  resolvePublicProxyAction({
    enabled: true,
    environment: { ALLOWED_MARKETS: "sk,cz,hu,ro" },
    host: "herbatica.sk",
    method: "GET",
    pathname,
    ...overrides,
  })

describe("full public URL proxy", () => {
  it.each([
    ["/", "/~sf/sk/home", "home"],
    ["/produkty", "/~sf/sk/products/index", "product.index"],
    ["/produkty/ashwagandha", "/~sf/sk/products/ashwagandha", "product.detail"],
    ["/kategorie/bylinky", "/~sf/sk/category/bylinky", "category.detail"],
    ["/znacky", "/~sf/sk/brands/index", "brand.index"],
    ["/poradna/clanok", "/~sf/sk/advice/clanok", "article.detail"],
    [
      "/informacie/kontaktujte-nas",
      "/~sf/sk/information/kontaktujte-nas",
      "page.detail",
    ],
    ["/casto-kladene-otazky", "/~sf/sk/static/faq", "static.faq"],
    ["/vyhladavanie", "/~sf/sk/search", "search"],
    ["/kosik", "/~sf/sk/cart", "cart"],
    ["/pokladna/platba", "/~sf/sk/checkout/payment", "checkout.payment"],
    [
      "/pokladna/potvrdenie-objednavky/Order-AbC",
      "/~sf/sk/checkout/confirmation/Order-AbC",
      "checkout.confirmation",
    ],
    [
      "/ucet/objednavky/Order-AbC",
      "/~sf/sk/account/order/Order-AbC",
      "account.order",
    ],
    [
      "/ucet/zrusenie-uctu",
      "/~sf/sk/account/deactivation",
      "account.deactivation",
    ],
    [
      "/recenzie/produkt/Token-AbC",
      "/~sf/sk/reviews/product/Token-AbC",
      "reviews.product",
    ],
  ])("rewrites %s to its semantic Pages target", (pathname, internal, routeKey) => {
    expect(resolve(pathname)).toMatchObject({
      kind: "rewrite",
      pathname: internal,
      routeKey,
    })
  })

  it("selects localized namespaces from the verified host market", () => {
    expect(
      resolve("/termekek/ashwagandha", { host: "herbatica.hu" })
    ).toMatchObject({
      kind: "rewrite",
      market: "hu",
      pathname: "/~sf/hu/products/ashwagandha",
    })
    expect(resolve("/produkty/ashwagandha", { host: "herbatica.hu" })).toEqual({
      kind: "respond",
      status: 404,
    })
  })

  it("accepts an explicitly bound deployment host without treating it as canonical", () => {
    expect(
      resolve("/produkty/ashwagandha", {
        environment: {
          ALLOWED_MARKETS: "sk,cz,hu,ro",
          HERBATICA_ACCEPTED_HOSTS_SK:
            "test-engine-herbatika-zane.web-revolution.cz",
        },
        host: "test-engine-herbatika-zane.web-revolution.cz",
      })
    ).toMatchObject({
      canonicalizationRequired: true,
      kind: "rewrite",
      market: "sk",
    })
  })

  it.each([
    "/p/legacy",
    "/c/legacy",
    "/blog",
    "/account",
    "/auth/login",
  ])("does not preserve development-only route %s", (pathname) => {
    expect(resolve(pathname)).toEqual({ kind: "respond", status: 404 })
  })

  it.each([
    ["/kampane", "herbatica.sk"],
    ["/kampany", "herbatica.cz"],
    ["/kampanyok", "herbatica.hu"],
    ["/campanii", "herbatica.ro"],
  ])("omits the unimplemented campaign family %s", (pathname, host) => {
    expect(resolve(pathname, { host })).toEqual({
      kind: "respond",
      status: 404,
    })
  })

  it.each([
    "/~sf/sk/home",
    "/~SF/sk/home",
    "/%7Esf/sk/home",
    "/%257Esf/sk/home",
  ])("blocks the internal namespace %s", (pathname) => {
    expect(resolve(pathname)).toEqual({ kind: "respond", status: 404 })
  })

  it("fails unknown hosts closed", () => {
    expect(resolve("/", { host: "unknown.example" })).toEqual({
      kind: "respond",
      status: 421,
    })
  })

  it("restricts host ownership to the deployment ALLOWED_MARKETS", () => {
    expect(
      resolve("/", {
        environment: { ALLOWED_MARKETS: "sk,cz" },
        host: "herbatica.hu",
      })
    ).toEqual({ kind: "respond", status: 421 })
    expect(
      resolve("/", {
        environment: { ALLOWED_MARKETS: "sk,cz" },
        host: "herbatica.cz",
      })
    ).toMatchObject({ kind: "rewrite", market: "cz" })
  })

  it("fails closed when ALLOWED_MARKETS is absent or invalid", () => {
    expect(resolve("/", { environment: {} })).toEqual({
      kind: "respond",
      status: 421,
    })
    expect(resolve("/", { environment: { ALLOWED_MARKETS: "sk,sk" } })).toEqual(
      { kind: "respond", status: 421 }
    )
  })

  it.each([
    "/robots.txt",
    "/sitemap.xml",
    "/sitemaps/products-1.xml",
    "/manifest.webmanifest",
    "/feeds/products.xml",
    "/favicon.ico",
    "/.well-known/security.txt",
  ])("passes verified-host system route %s to its route handler", (pathname) => {
    expect(resolve(pathname)).toEqual({ kind: "next" })
    expect(resolve(pathname, { host: "unknown.example" })).toEqual({
      kind: "respond",
      status: 421,
    })
  })

  it("preserves /o-nas for SK/CZ and redirects HU/RO to localized about", () => {
    expect(resolve("/o-nas")).toMatchObject({
      kind: "rewrite",
      routeKey: "static.about",
    })
    expect(resolve("/o-nas", { host: "herbatica.cz" })).toMatchObject({
      kind: "rewrite",
      routeKey: "static.about",
    })
    expect(resolve("/o-nas", { host: "herbatica.hu" })).toEqual({
      destination: "https://herbatica.hu/rolunk",
      kind: "redirect",
      status: 308,
    })
    expect(resolve("/o-nas", { host: "herbatica.ro" })).toEqual({
      destination: "https://herbatica.ro/despre-noi",
      kind: "redirect",
      status: 308,
    })
  })

  it("enforces public HTML methods before routing", () => {
    expect(resolve("/produkty/a", { method: "POST" })).toEqual({
      allow: "GET, HEAD",
      kind: "respond",
      status: 405,
    })
    expect(resolve("/produkty/a", { method: "OPTIONS" })).toEqual({
      allow: "GET, HEAD",
      kind: "respond",
      status: 204,
    })
  })

  it("marks case, slash, and accepted-host repairs for one SSR redirect", () => {
    expect(resolve("/PRODUKTY/ASHWAGANDHA/")).toMatchObject({
      canonicalizationRequired: true,
      kind: "rewrite",
    })
  })

  it("is inert until the full cutover flag is enabled", () => {
    expect(
      resolvePublicProxyAction({
        enabled: false,
        host: "unknown.example",
        method: "GET",
        pathname: "/anything",
      })
    ).toEqual({ kind: "next" })
  })
})
