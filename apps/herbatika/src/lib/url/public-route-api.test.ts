import { describe, expect, it, vi } from "vitest"
import type { ActiveEntityRouteTarget } from "@/lib/url-registry/model"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import {
  buildAlternates,
  parsePublicPath,
  resolvePublicRoute,
} from "./public-route-api"
import type { Market } from "./types"

const activeTarget = (
  market: Market,
  slug: string,
  overrides: Partial<ActiveEntityRouteTarget["route"]> = {}
): ActiveEntityRouteTarget => {
  const routeId = overrides.id ?? `route-${market}`
  return {
    currentSlug: {
      createdAt: "2026-08-19T00:00:00.000Z",
      disposition: "current",
      id: `slug-${market}`,
      kind: overrides.kind ?? "product",
      market,
      normalizationVersion: 1,
      normalizedSlug: slug,
      routeId,
    },
    projectionType: "entity",
    route: {
      createdAt: "2026-08-19T00:00:00.000Z",
      equivalenceKey: "medusa:product:prod_1",
      id: routeId,
      indexPolicy: "indexable",
      kind: "product",
      market,
      sourceId: "prod_1",
      sourceSystem: "medusa",
      sourceType: "product",
      staticRouteKey: null,
      status: "active",
      successorRouteId: null,
      targetType: "entity",
      updatedAt: "2026-08-19T00:00:00.000Z",
      version: 1,
      ...overrides,
    },
  }
}

describe("parsePublicPath", () => {
  it.each([
    ["sk", "/", { kind: "home" }],
    ["cz", "/produkty", { kind: "product" }],
    ["hu", "/kategoriak/bylinky", { kind: "category", slug: "bylinky" }],
    ["ro", "/marci/herbatica", { kind: "brand", slug: "herbatica" }],
    ["sk", "/kolekcie/spanok", { kind: "collection", slug: "spanok" }],
    ["cz", "/poradna/spanek", { kind: "article", slug: "spanek" }],
    ["hu", "/informaciok/rolunk", { kind: "page", slug: "rolunk" }],
    ["ro", "/intrebari-frecvente", { kind: "static", page: "faq" }],
    ["sk", "/vyhladavanie", { kind: "search" }],
    ["cz", "/kosik", { kind: "cart" }],
    ["hu", "/penztar/fizetes", { kind: "checkout", step: "payment" }],
    [
      "ro",
      "/finalizare-comanda/confirmare-comanda/Order-AbC",
      { kind: "checkout", step: "confirmation", value: "Order-AbC" },
    ],
    [
      "sk",
      "/ucet/objednavky/Order-AbC",
      { kind: "account", section: "orders", value: "Order-AbC" },
    ],
    [
      "cz",
      "/ucet/obnova-hesla/Token-AbC",
      { kind: "account", section: "resetPassword", value: "Token-AbC" },
    ],
    [
      "hu",
      "/velemenyek/termek/Token-AbC",
      { kind: "review", token: "Token-AbC" },
    ],
  ] as const)("parses %s %s to one semantic target", (market, pathname, target) => {
    const parsed = parsePublicPath({ market, pathname })
    expect(parsed).toMatchObject({
      canonicalization: { required: false },
      kind: "found",
      market,
      navigation: "document",
      target,
    })
  })

  it("composes path and query repairs into one canonicalization destination", () => {
    expect(
      parsePublicPath({
        market: "sk",
        pathname: "/PRODUKTY/ASHWAGANDHA/",
        rawQuery: "variant=SKU-AbC&unknown=drop&utm_source=mail",
      })
    ).toMatchObject({
      canonicalization: {
        destination: "/produkty/ashwagandha?variant=SKU-AbC&utm_source=mail",
        pathRequired: true,
        queryRequired: true,
        required: true,
      },
      kind: "found",
      seo: { alternateEligible: true, canonicalRawQuery: "", indexable: true },
      target: { kind: "product", slug: "ashwagandha" },
    })
  })

  it("normalizes listing queries and classifies page two independently", () => {
    expect(
      parsePublicPath({
        lastPage: 4,
        market: "sk",
        pathname: "/kategorie/bylinky",
        rawQuery: "page=2",
      })
    ).toMatchObject({
      kind: "found",
      query: {
        canonicalRawQuery: "page=2",
        kind: "accept",
        values: { page: 2 },
      },
      seo: {
        alternateEligible: false,
        canonicalRawQuery: "page=2",
        indexable: true,
        sitemapEligible: false,
      },
    })
  })

  it("preserves account-list selection and product review pagination", () => {
    expect(
      parsePublicPath({
        market: "sk",
        pathname: "/ucet/zoznamy",
        rawQuery: "list=plist_01HzX9_A",
      })
    ).toMatchObject({
      kind: "found",
      query: {
        canonicalRawQuery: "list=plist_01HzX9_A",
        kind: "accept",
        values: { list: "plist_01HzX9_A" },
      },
      seo: { canonicalRawQuery: null, indexable: false },
    })
    expect(
      parsePublicPath({
        market: "sk",
        pathname: "/produkty/ashwagandha",
        rawQuery: "reviews_page=2",
      })
    ).toMatchObject({
      kind: "found",
      query: {
        canonicalRawQuery: "reviews_page=2",
        kind: "accept",
        values: { reviews_page: 2 },
      },
      target: { kind: "product", slug: "ashwagandha" },
    })
  })

  it("maps invalid and out-of-range queries to a typed not-found", () => {
    expect(
      parsePublicPath({
        lastPage: 2,
        market: "sk",
        pathname: "/produkty",
        rawQuery: "page=3",
      })
    ).toEqual({
      kind: "not-found",
      market: "sk",
      queryReason: "page-out-of-range",
      reason: "query-not-found",
    })
  })

  it("preserves private exact query bytes while keeping the route noindex", () => {
    expect(
      parsePublicPath({
        market: "cz",
        pathname: "/pokladna/navrat-z-platby/",
        rawQuery: "signature=AbC%2B123&state=x",
      })
    ).toMatchObject({
      canonicalization: {
        destination: "/pokladna/navrat-z-platby?signature=AbC%2B123&state=x",
        required: true,
      },
      kind: "found",
      query: null,
      seo: { canonicalRawQuery: null, indexable: false },
    })
  })

  it.each([
    "/a//b",
    "/a\\b",
    "/produkty/%2Fetc",
    "/produkty/%252Fetc",
    "/produkty/%E0%A4%A",
    "/produkty/a%00b",
    "/produkty/a%2Fb",
  ])("rejects malformed or separator-smuggling path %s", (pathname) => {
    expect(parsePublicPath({ market: "sk", pathname })).toMatchObject({
      kind: "not-found",
      reason: "malformed-path",
    })
  })

  it.each([
    "q=%",
    "q=%0G",
    "q=ok%00bad",
  ])("rejects malformed or control-bearing query %s", (rawQuery) => {
    expect(
      parsePublicPath({ market: "sk", pathname: "/vyhladavanie", rawQuery })
    ).toMatchObject({ kind: "not-found", reason: "malformed-path" })
  })

  it.each([
    "/~sf/sk/home",
    "/~SF/sk/home",
    "/%7Esf/sk/home",
    "/%257Esf/sk/home",
  ])("rejects internal namespace spelling %s", (pathname) => {
    expect(parsePublicPath({ market: "sk", pathname })).toMatchObject({
      kind: "not-found",
      reason: "internal-namespace",
    })
  })

  it.each([
    "/akcie",
    "/akcie/letna",
    "/p/legacy",
    "/informacie",
  ])("omits disabled or invalid public route %s", (pathname) => {
    expect(parsePublicPath({ market: "sk", pathname })).toMatchObject({
      kind: "not-found",
      reason: "route-not-found",
    })
  })
})

describe("resolvePublicRoute", () => {
  it("does not call URLR for non-entity and entity-index targets", async () => {
    const resolveEntity = vi.fn()
    const parsed = parsePublicPath({ market: "sk", pathname: "/produkty" })

    await expect(
      resolvePublicRoute({ parsed, resolveEntity })
    ).resolves.toMatchObject({
      kind: "current",
      target: { kind: "product" },
    })
    expect(resolveEntity).not.toHaveBeenCalled()
  })

  it("returns a current URLR entity projection", async () => {
    const active = activeTarget("sk", "ashwagandha")
    const parsed = parsePublicPath({
      market: "sk",
      pathname: "/produkty/ashwagandha",
    })
    const resolveEntity = vi.fn(async () => ({
      kind: "found" as const,
      value: {
        currentSlug: active.currentSlug,
        disposition: "current" as const,
        matchedSlug: active.currentSlug,
        route: active.route,
      },
    }))

    await expect(
      resolvePublicRoute({ parsed, resolveEntity })
    ).resolves.toMatchObject({
      activeEntity: active,
      kind: "current",
    })
    expect(resolveEntity).toHaveBeenCalledWith({
      kind: "product",
      market: "sk",
      normalizedSlug: "ashwagandha",
    })
  })

  it("combines an URLR alias and normalized query in one absolute 308", async () => {
    const active = activeTarget("sk", "new-slug")
    const parsed = parsePublicPath({
      market: "sk",
      pathname: "/produkty/old-slug/",
      rawQuery: "variant=SKU-AbC&unknown=drop&utm_source=mail",
    })
    const resolveEntity = vi.fn(async () => ({
      kind: "found" as const,
      value: {
        currentSlug: active.currentSlug,
        disposition: "alias" as const,
        matchedSlug: {
          ...active.currentSlug,
          disposition: "alias" as const,
          normalizedSlug: "old-slug",
        },
        route: active.route,
      },
    }))

    await expect(
      resolvePublicRoute({ parsed, resolveEntity })
    ).resolves.toEqual({
      destination:
        "https://herbatica.sk/produkty/new-slug?variant=SKU-AbC&utm_source=mail",
      kind: "redirect",
      status: 308,
      target: { kind: "product", slug: "new-slug" },
    })
  })

  it.each([
    [
      { kind: "missing" as const },
      { kind: "not-found", reason: "route-not-found" },
    ],
    [
      { kind: "unavailable" as const, retryAfterSeconds: 17 },
      { kind: "unavailable", retryAfterSeconds: 17 },
    ],
    [
      { causeCode: "bad-row", kind: "invalid-response" as const },
      { causeCode: "bad-row", kind: "unavailable" },
    ],
  ])("maps URLR read outcome %#", async (lookup, expected) => {
    const parsed = parsePublicPath({
      market: "sk",
      pathname: "/produkty/ashwagandha",
    })
    await expect(
      resolvePublicRoute({ parsed, resolveEntity: vi.fn(async () => lookup) })
    ).resolves.toEqual(expected)
  })

  it("maps a URLR tombstone to gone", async () => {
    const active = activeTarget("sk", "ashwagandha")
    const parsed = parsePublicPath({
      market: "sk",
      pathname: "/produkty/ashwagandha",
    })
    await expect(
      resolvePublicRoute({
        parsed,
        resolveEntity: vi.fn(
          async () =>
            ({
              kind: "found",
              value: {
                disposition: "gone",
                matchedSlug: {
                  ...active.currentSlug,
                  disposition: "gone",
                  routeId: null,
                },
                route: null,
              },
            }) as const
        ),
      })
    ).resolves.toEqual({ kind: "gone" })
  })

  it("redirects a superseded route directly to its current successor", async () => {
    const successor = activeTarget("sk", "successor")
    const retired = activeTarget("sk", "retired", {
      id: "route-retired",
      status: "superseded",
      successorRouteId: successor.route.id,
    })
    const parsed = parsePublicPath({
      market: "sk",
      pathname: "/produkty/retired",
    })

    await expect(
      resolvePublicRoute({
        parsed,
        resolveEntity: vi.fn(
          async () =>
            ({
              kind: "found",
              value: {
                currentSlug: successor.currentSlug,
                disposition: "superseded",
                matchedSlug: retired.currentSlug,
                route: retired.route,
                successorRoute: successor.route,
              },
            }) as const
        ),
      })
    ).resolves.toMatchObject({
      destination: "https://herbatica.sk/produkty/successor",
      kind: "redirect",
      status: 308,
    })
  })

  it("honors an URLR noindex policy on a current entity", async () => {
    const active = activeTarget("sk", "ashwagandha", {
      indexPolicy: "noindex",
    })
    const parsed = parsePublicPath({
      market: "sk",
      pathname: "/produkty/ashwagandha",
    })

    await expect(
      resolvePublicRoute({
        parsed,
        resolveEntity: vi.fn(
          async () =>
            ({
              kind: "found",
              value: {
                currentSlug: active.currentSlug,
                disposition: "current",
                matchedSlug: active.currentSlug,
                route: active.route,
              },
            }) as const
        ),
      })
    ).resolves.toMatchObject({
      kind: "current",
      seo: {
        alternateEligible: false,
        canonicalRawQuery: null,
        indexable: false,
        sitemapEligible: false,
      },
    })
  })
})

describe("buildAlternates", () => {
  it("always returns self when no equivalence identity exists", async () => {
    const target = activeTarget("sk", "ashwagandha", { equivalenceKey: null })
    const findActiveEquivalents = vi.fn()
    const loadSource = vi.fn()

    await expect(
      buildAlternates({ findActiveEquivalents, loadSource, target })
    ).resolves.toEqual({
      kind: "found",
      value: { "sk-SK": "https://herbatica.sk/produkty/ashwagandha" },
    })
    expect(findActiveEquivalents).not.toHaveBeenCalled()
    expect(loadSource).not.toHaveBeenCalled()
  })

  it("includes reciprocal current/source-found routes and omits missing markets", async () => {
    const sk = activeTarget("sk", "ashwagandha")
    const cz = activeTarget("cz", "ashwagandha-cz")
    const hu = activeTarget("hu", "ashwagandha-hu")
    const found = { kind: "found", value: {} } as const
    const missing = { kind: "missing" } as const

    await expect(
      buildAlternates({
        findActiveEquivalents: vi.fn(
          async () =>
            ({
              kind: "found",
              value: [hu, sk, cz],
            }) as const
        ),
        loadSource: vi.fn(async (candidate) =>
          candidate.route.market === "hu" ? missing : found
        ),
        target: sk,
      })
    ).resolves.toEqual({
      kind: "found",
      value: {
        "cs-CZ": "https://herbatica.cz/produkty/ashwagandha-cz",
        "sk-SK": "https://herbatica.sk/produkty/ashwagandha",
      },
    })
  })

  it("fails closed instead of publishing an incomplete set on source failure", async () => {
    const sk = activeTarget("sk", "ashwagandha")
    const cz = activeTarget("cz", "ashwagandha-cz")
    const unavailable: SourceReadResult<unknown> = {
      kind: "unavailable",
      retryAfterSeconds: 30,
    }
    await expect(
      buildAlternates({
        findActiveEquivalents: vi.fn(
          async () =>
            ({
              kind: "found",
              value: [cz],
            }) as const
        ),
        loadSource: vi.fn(async () => unavailable),
        target: sk,
      })
    ).resolves.toEqual(unavailable)
  })

  it("rejects duplicate current routes for one equivalent market", async () => {
    const sk = activeTarget("sk", "ashwagandha")
    const duplicate = activeTarget("sk", "other", { id: "route-sk-other" })
    await expect(
      buildAlternates({
        findActiveEquivalents: vi.fn(
          async () =>
            ({
              kind: "found",
              value: [duplicate],
            }) as const
        ),
        loadSource: vi.fn(),
        target: sk,
      })
    ).resolves.toEqual({
      causeCode: "duplicate-equivalent-market",
      kind: "invalid-response",
    })
  })
})
