import { describe, expect, it } from "vitest"
import {
  OFFICIAL_CONTENT_SECTIONS,
  resolveOfficialContentSectionRedirect,
} from "./official-content-section-redirects"
import { resolvePublicProxyAction } from "./public-proxy"

const REGISTRY_SLUG_GRAMMAR = /^[a-z0-9-]+$/

const ROUTING_ENVIRONMENT = {
  ALLOWED_MARKETS: "sk,cz,hu,ro",
  MARKET_ACCEPTED_HOSTS_CZ: "herbatica.cz",
  MARKET_ACCEPTED_HOSTS_HU: "herbatica.hu",
  MARKET_ACCEPTED_HOSTS_RO: "herbatica.ro",
  MARKET_ACCEPTED_HOSTS_SK: "herbatica.sk",
} as const

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
    resolveUnknownStaticPaths: true,
    ...overrides,
  })

describe("official content-section redirects", () => {
  it("redirects an SK official magazin article to the local blog article", () => {
    expect(
      resolveOfficialContentSectionRedirect("sk", ["magazin", "longevity"])
    ).toBe("/blog/longevity")
  })

  it("redirects an SK official slovnik-pojmov term to the local blog article", () => {
    expect(
      resolveOfficialContentSectionRedirect("sk", [
        "slovnik-pojmov",
        "ashwagandha",
      ])
    ).toBe("/blog/ashwagandha")
  })

  it("redirects a CZ official magazin article to the local blog article", () => {
    expect(
      resolveOfficialContentSectionRedirect("cz", ["magazin", "graviola"])
    ).toBe("/blog/graviola")
  })

  it("redirects an SK official magazin article through the proxy", () => {
    expect(resolve("/magazin/longevity")).toEqual({
      kind: "redirect",
      location: "/blog/longevity",
      status: 308,
    })
  })

  it("redirects an SK official slovnik-pojmov term through the proxy", () => {
    expect(resolve("/slovnik-pojmov/ashwagandha")).toEqual({
      kind: "redirect",
      location: "/blog/ashwagandha",
      status: 308,
    })
  })

  it("redirects a CZ official magazin article through the proxy", () => {
    expect(resolve("/magazin/graviola", { host: "herbatica.cz" })).toEqual({
      kind: "redirect",
      location: "/blog/graviola",
      status: 308,
    })
  })

  it("accepts the slug case-insensitively", () => {
    expect(resolve("/magazin/LONGEVITY")).toEqual({
      kind: "redirect",
      location: "/blog/longevity",
      status: 308,
    })
    expect(
      resolveOfficialContentSectionRedirect("sk", ["MAGAZIN", "longevity"])
    ).toBe("/blog/longevity")
  })

  it("redirects the SK magazin section index to the local blog index", () => {
    expect(resolveOfficialContentSectionRedirect("sk", ["magazin"])).toBe(
      "/blog"
    )
    expect(resolve("/magazin")).toEqual({
      kind: "redirect",
      location: "/blog",
      status: 308,
    })
  })

  it("redirects the SK slovnik-pojmov section index to the local blog index", () => {
    expect(
      resolveOfficialContentSectionRedirect("sk", ["slovnik-pojmov"])
    ).toBe("/blog")
    expect(resolve("/slovnik-pojmov")).toEqual({
      kind: "redirect",
      location: "/blog",
      status: 308,
    })
  })

  it("redirects the CZ magazin section index to the local blog index", () => {
    expect(resolveOfficialContentSectionRedirect("cz", ["magazin"])).toBe(
      "/blog"
    )
  })

  it("redirects a suffixed slovnik-pojmov collision slug to its -pojem article", () => {
    // "zelezo" collided with a pre-existing, different local article, so it
    // was imported as a new article under "zelezo-pojem" instead of being
    // dropped — the official term must still resolve, to the right article.
    expect(
      resolveOfficialContentSectionRedirect("sk", ["slovnik-pojmov", "zelezo"])
    ).toBe("/blog/zelezo-pojem")
    expect(resolve("/slovnik-pojmov/zelezo")).toEqual({
      kind: "redirect",
      location: "/blog/zelezo-pojem",
      status: 308,
    })
  })

  it("redirects another suffixed slovnik-pojmov collision slug to its -pojem article", () => {
    expect(
      resolveOfficialContentSectionRedirect("sk", ["slovnik-pojmov", "kolagen"])
    ).toBe("/blog/kolagen-pojem")
  })

  it("redirects the karotenoidy slovnik-pojmov term as a plain identity match", () => {
    // Unlike the 14 -pojem exceptions, karotenoidy needed no re-import: the
    // official term already exactly matches a pre-existing local article
    // (same title, same slug).
    expect(
      resolveOfficialContentSectionRedirect("sk", [
        "slovnik-pojmov",
        "karotenoidy",
      ])
    ).toBe("/blog/karotenoidy")
  })

  it("does not redirect a genuinely unlisted slovnik-pojmov slug", () => {
    expect(
      resolveOfficialContentSectionRedirect("sk", [
        "slovnik-pojmov",
        "totally-unknown-glossary-slug-xyz",
      ])
    ).toBeNull()
    expect(
      resolve("/slovnik-pojmov/totally-unknown-glossary-slug-xyz")
    ).not.toMatchObject({
      kind: "redirect",
    })
  })

  it("does not redirect an unknown magazin slug", () => {
    expect(
      resolveOfficialContentSectionRedirect("sk", [
        "magazin",
        "totally-unknown-slug-xyz",
      ])
    ).toBeNull()
  })

  it("keeps CZ scoped away from slovnik-pojmov (SK-only section)", () => {
    expect(
      resolveOfficialContentSectionRedirect("cz", [
        "slovnik-pojmov",
        "ashwagandha",
      ])
    ).toBeNull()
    expect(
      resolve("/slovnik-pojmov/ashwagandha", { host: "herbatica.cz" })
    ).not.toMatchObject({ kind: "redirect" })
    expect(
      resolveOfficialContentSectionRedirect("cz", ["slovnik-pojmov"])
    ).toBeNull()
  })

  it("keeps HU and RO fully outside both sections", () => {
    expect(
      resolveOfficialContentSectionRedirect("hu", ["magazin", "longevity"])
    ).toBeNull()
    expect(
      resolveOfficialContentSectionRedirect("ro", ["magazin", "graviola"])
    ).toBeNull()
    expect(
      resolveOfficialContentSectionRedirect("hu", [
        "slovnik-pojmov",
        "ashwagandha",
      ])
    ).toBeNull()
    expect(resolveOfficialContentSectionRedirect("hu", ["magazin"])).toBeNull()
    expect(resolveOfficialContentSectionRedirect("ro", ["magazin"])).toBeNull()
  })

  it("only matches 1 or 2 segments, never 0 or 3+", () => {
    expect(resolveOfficialContentSectionRedirect("sk", [])).toBeNull()
    expect(
      resolveOfficialContentSectionRedirect("sk", [
        "magazin",
        "longevity",
        "extra",
      ])
    ).toBeNull()
    expect(
      resolveOfficialContentSectionRedirect("sk", [
        "kategorie",
        "magazin",
        "longevity",
      ])
    ).toBeNull()
  })

  it("keeps the proxy method grammar closed on official content-section paths", () => {
    expect(resolve("/magazin/longevity", { method: "POST" })).toEqual({
      allow: "GET, HEAD",
      kind: "respond",
      status: 405,
    })
    expect(resolve("/magazin/longevity", { method: "OPTIONS" })).toEqual({
      allow: "GET, HEAD",
      kind: "respond",
      status: 204,
    })
  })

  it("only contains slugs that satisfy the registry slug grammar", () => {
    for (const market of Object.keys(OFFICIAL_CONTENT_SECTIONS) as Array<
      keyof typeof OFFICIAL_CONTENT_SECTIONS
    >) {
      for (const slugs of Object.values(OFFICIAL_CONTENT_SECTIONS[market])) {
        for (const slug of slugs ?? []) {
          expect(slug).toMatch(REGISTRY_SLUG_GRAMMAR)
        }
      }
    }
  })

  it("has the exact expected table sizes: sk magazin 75, cz magazin 64, sk slovnik-pojmov 120 identity + 14 suffixed", () => {
    expect(OFFICIAL_CONTENT_SECTIONS.sk.magazin?.size).toBe(75)
    expect(OFFICIAL_CONTENT_SECTIONS.cz.magazin?.size).toBe(64)
    expect(OFFICIAL_CONTENT_SECTIONS.sk["slovnik-pojmov"]?.size).toBe(120)
  })

  it("declares no sections at all for hu and ro", () => {
    expect(Object.keys(OFFICIAL_CONTENT_SECTIONS.hu)).toHaveLength(0)
    expect(Object.keys(OFFICIAL_CONTENT_SECTIONS.ro)).toHaveLength(0)
  })

  it("resolves every table entry to a same-slug local blog path", () => {
    for (const market of Object.keys(OFFICIAL_CONTENT_SECTIONS) as Array<
      keyof typeof OFFICIAL_CONTENT_SECTIONS
    >) {
      for (const [section, slugs] of Object.entries(
        OFFICIAL_CONTENT_SECTIONS[market]
      )) {
        for (const slug of slugs ?? []) {
          expect(
            resolveOfficialContentSectionRedirect(market, [section, slug])
          ).toBe(`/blog/${slug}`)
        }
      }
    }
  })

  it("redirects all 14 slug-collision candidates to their -pojem article, kept out of the identity set", () => {
    const suffixed = [
      "brusnica-obycajna",
      "cakankova-kava",
      "elektrolyty",
      "ginkgo-biloba",
      "kapucinka-vacsia",
      "koenzym-q10",
      "kolagen",
      "kreatin",
      "kyselina-listova",
      "praslicka-rolna",
      "psyllium",
      "taurin",
      "vitamin-a",
      "zelezo",
    ]
    for (const slug of suffixed) {
      expect(OFFICIAL_CONTENT_SECTIONS.sk["slovnik-pojmov"]?.has(slug)).toBe(
        false
      )
      expect(
        resolveOfficialContentSectionRedirect("sk", ["slovnik-pojmov", slug])
      ).toBe(`/blog/${slug}-pojem`)
    }
  })

  it("keeps karotenoidy as an identity entry, not a suffixed exception", () => {
    expect(
      OFFICIAL_CONTENT_SECTIONS.sk["slovnik-pojmov"]?.has("karotenoidy")
    ).toBe(true)
  })
})
