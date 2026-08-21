import { describe, expect, it } from "vitest"
import { resolvePublicProxyAction } from "./public-proxy"

const ROUTING_ENVIRONMENT = {
  ALLOWED_MARKETS: "sk,cz,hu,ro",
  MARKET_ACCEPTED_HOSTS_CZ:
    "herbatica.cz,www.herbatica.cz,test-engine-herbatika-cz-zane.web-revolution.cz",
  MARKET_ACCEPTED_HOSTS_HU:
    "herbatica.hu,www.herbatica.hu,test-engine-herbatika-hu-zane.web-revolution.cz",
  MARKET_ACCEPTED_HOSTS_RO:
    "herbatica.ro,www.herbatica.ro,test-engine-herbatika-ro-zane.web-revolution.cz",
  MARKET_ACCEPTED_HOSTS_SK:
    "herbatica.sk,www.herbatica.sk,test-engine-herbatika-zane.web-revolution.cz",
} as const

const HOST_MATRIX = [
  ["herbatica.sk", "sk", false, "https://herbatica.sk"],
  ["www.herbatica.sk", "sk", true, "https://herbatica.sk"],
  [
    "test-engine-herbatika-zane.web-revolution.cz",
    "sk",
    true,
    "https://herbatica.sk",
  ],
  ["herbatica.cz", "cz", false, "https://herbatica.cz"],
  ["www.herbatica.cz", "cz", true, "https://herbatica.cz"],
  [
    "test-engine-herbatika-cz-zane.web-revolution.cz",
    "cz",
    true,
    "https://herbatica.cz",
  ],
  ["herbatica.hu", "hu", false, "https://herbatica.hu"],
  ["www.herbatica.hu", "hu", true, "https://herbatica.hu"],
  [
    "test-engine-herbatika-hu-zane.web-revolution.cz",
    "hu",
    true,
    "https://herbatica.hu",
  ],
  ["herbatica.ro", "ro", false, "https://herbatica.ro"],
  ["www.herbatica.ro", "ro", true, "https://herbatica.ro"],
  [
    "test-engine-herbatika-ro-zane.web-revolution.cz",
    "ro",
    true,
    "https://herbatica.ro",
  ],
] as const

const resolve = (
  pathname: string,
  overrides: Partial<Parameters<typeof resolvePublicProxyAction>[0]> = {}
) =>
  resolvePublicProxyAction({
    enabled: true,
    environment: ROUTING_ENVIRONMENT,
    host: "herbatica.sk",
    method: "GET",
    pathname,
    ...overrides,
  })

describe("full public URL proxy", () => {
  it.each([
    ["/", "/~sf/sk/home", "home"],
    ["/produkty", "/~sf/sk/products", "product.index"],
    ["/produkty/ashwagandha", "/~sf/sk/products/ashwagandha", "product.detail"],
    ["/kategorie", "/~sf/sk/categories", "category.index"],
    ["/kategorie/bylinky", "/~sf/sk/category/bylinky", "category.detail"],
    ["/znacky", "/~sf/sk/brands", "brand.index"],
    ["/kolekcie", "/~sf/sk/collections", "collection.index"],
    ["/poradna", "/~sf/sk/advice", "article.index"],
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

  it.each(
    HOST_MATRIX
  )("binds accepted host %s to %s and its canonical origin", (host, market, canonicalizationRequired, canonicalOrigin) => {
    expect(resolve("/", { host })).toMatchObject({
      canonicalOrigin,
      canonicalizationRequired,
      kind: "rewrite",
      market,
    })
  })

  it.each([
    ["/contact", "contact"],
    ["/livrare", "shipping"],
    ["/retururi", "returns"],
    ["/termeni-si-conditii", "terms"],
    ["/politica-de-confidentialitate", "privacy"],
    ["/politica-cookies", "cookies"],
    ["/program-afiliere", "affiliate"],
    ["/vanzare-en-gros", "wholesale"],
    ["/dropshipping", "dropshipping"],
    ["/marca-proprie", "privateLabel"],
    ["/voucher-cadou", "giftVoucher"],
  ])("rewrites the RO static route %s", (pathname, pageKey) => {
    expect(resolve(pathname, { host: "herbatica.ro" })).toMatchObject({
      kind: "rewrite",
      market: "ro",
      pathname: `/~sf/ro/static/${pageKey}`,
      routeKey: `static.${pageKey}`,
    })
  })

  it.each([
    "/program-afiliere",
    "/vanzare-en-gros",
    "/dropshipping",
    "/marca-proprie",
    "/voucher-cadou",
  ])("does not publish the RO-only static route %s on SK", (pathname) => {
    expect(resolve(pathname)).toEqual({ kind: "respond", status: 404 })
  })

  it("uses the first configured deployment host as canonical", () => {
    expect(
      resolve("/produkty/ashwagandha", {
        environment: {
          ...ROUTING_ENVIRONMENT,
          MARKET_ACCEPTED_HOSTS_SK:
            "test-engine-herbatika-zane.web-revolution.cz,preview-alias.example",
        },
        host: "test-engine-herbatika-zane.web-revolution.cz",
      })
    ).toMatchObject({
      canonicalOrigin: "https://test-engine-herbatika-zane.web-revolution.cz",
      canonicalizationRequired: false,
      kind: "rewrite",
      market: "sk",
    })
  })

  it("accepts an arbitrary configured Romanian deployment host", () => {
    const previewHost = "test-engine-herbatika-ro-zane.web-revolution.cz"

    expect(
      resolve("/", {
        environment: {
          ...ROUTING_ENVIRONMENT,
          MARKET_ACCEPTED_HOSTS_RO: previewHost,
        },
        host: previewHost,
      })
    ).toMatchObject({
      canonicalizationRequired: false,
      kind: "rewrite",
      market: "ro",
      pathname: "/~sf/ro/home",
    })
    expect(
      resolve("/", {
        environment: {
          ALLOWED_MARKETS: "sk,cz,hu",
          MARKET_ACCEPTED_HOSTS_CZ: "herbatica.cz",
          MARKET_ACCEPTED_HOSTS_HU: "herbatica.hu",
          MARKET_ACCEPTED_HOSTS_SK: "herbatica.sk",
        },
        host: previewHost,
      })
    ).toEqual({ kind: "respond", status: 421 })
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
    expect(resolve(pathname, { enabled: false })).toEqual({
      kind: "respond",
      status: 404,
    })
  })

  it("fails unknown hosts closed", () => {
    expect(resolve("/", { host: "unknown.example" })).toEqual({
      kind: "respond",
      status: 421,
    })
    expect(
      resolve("/robots.txt", { enabled: false, host: "unknown.example" })
    ).toEqual({ kind: "respond", status: 421 })
  })

  it("restricts host ownership to the deployment ALLOWED_MARKETS", () => {
    expect(
      resolve("/", {
        environment: {
          ALLOWED_MARKETS: "sk,cz",
          MARKET_ACCEPTED_HOSTS_CZ: "herbatica.cz",
          MARKET_ACCEPTED_HOSTS_SK: "herbatica.sk",
        },
        host: "herbatica.hu",
      })
    ).toEqual({ kind: "respond", status: 421 })
    expect(
      resolve("/", {
        environment: {
          ALLOWED_MARKETS: "sk,cz",
          MARKET_ACCEPTED_HOSTS_CZ: "herbatica.cz",
          MARKET_ACCEPTED_HOSTS_SK: "herbatica.sk",
        },
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

  it("preserves canonical /o-nas for SK/CZ and rejects it for HU/RO", () => {
    expect(resolve("/o-nas")).toMatchObject({
      kind: "rewrite",
      routeKey: "static.about",
    })
    expect(resolve("/o-nas", { host: "herbatica.cz" })).toMatchObject({
      kind: "rewrite",
      routeKey: "static.about",
    })
    expect(resolve("/o-nas", { host: "herbatica.hu" })).toEqual({
      kind: "respond",
      status: 404,
    })
    expect(resolve("/o-nas", { host: "herbatica.ro" })).toEqual({
      kind: "respond",
      status: 404,
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
        environment: ROUTING_ENVIRONMENT,
        host: "herbatica.sk",
        method: "GET",
        pathname: "/anything",
      })
    ).toEqual({ kind: "next" })
  })
})
