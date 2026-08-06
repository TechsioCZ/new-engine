import { afterEach, describe, expect, it } from "vitest"
import {
  buildAbsoluteUrl,
  buildAccountUrl,
  buildAlternates,
  buildCanonical,
  buildCheckoutUrl,
  buildIndexUrl,
  buildProductVariantUrl,
  buildReviewUrl,
  buildUrl,
  MARKET_ORIGIN_ENV,
} from "./builder"
import type { UrlRecord } from "./types"

const originalSkOrigin = process.env[MARKET_ORIGIN_ENV.sk]

afterEach(() => {
  if (originalSkOrigin === undefined) {
    delete process.env[MARKET_ORIGIN_ENV.sk]
  } else {
    process.env[MARKET_ORIGIN_ENV.sk] = originalSkOrigin
  }
})

function record(overrides: Partial<UrlRecord> = {}): UrlRecord {
  return {
    id: "url_1",
    market: "sk",
    kind: "product",
    slug: "zeleny-caj",
    entityId: "prod_1",
    equivalenceKey: "tea_1",
    indexable: true,
    status: "current",
    aliasOf: null,
    updatedAt: new Date("2026-08-05T00:00:00Z"),
    ...overrides,
  }
}

describe("URL builder", () => {
  it("builds localized detail, index, and absolute URLs", () => {
    expect(buildUrl({ market: "hu", kind: "product", slug: "zold-tea" })).toBe(
      "/termekek/zold-tea"
    )
    expect(buildIndexUrl({ market: "ro", kind: "category" })).toBe("/categorii")
    expect(
      buildAbsoluteUrl({ market: "cz", kind: "brand", slug: "pukka" })
    ).toBe("https://herbatica.cz/znacky/pukka")
  })

  it("builds localized flow and case-preserving opaque paths", () => {
    expect(buildCheckoutUrl("ro", "checkout.payment")).toBe(
      "/finalizare-comanda/plata"
    )
    expect(buildAccountUrl("hu", "account.orders", "Order/ABC")).toBe(
      "/fiok/rendelesek/Order%2FABC"
    )
    expect(buildReviewUrl("cz", "Token-AbC")).toBe("/recenze/produkt/Token-AbC")
  })

  it("uses the Czech product variant query and strips it from canonical", () => {
    expect(
      buildProductVariantUrl({
        market: "sk",
        kind: "product",
        slug: "zeleny-caj",
        sku: "ZC-100G",
      })
    ).toBe("/produkty/zeleny-caj?varianta=ZC-100G")
    expect(
      buildCanonical({
        market: "sk",
        kind: "product",
        slug: "zeleny-caj",
        searchParams: { varianta: "ZC-100G" },
      })
    ).toBe("https://herbatica.sk/produkty/zeleny-caj")
  })

  it("canonicalizes protocol, host, case, slash, and query allowlist", () => {
    process.env[MARKET_ORIGIN_ENV.sk] =
      "http://WWW.Example.COM:8443/ignored/?source=config"

    expect(
      buildCanonical({
        market: "sk",
        pathname: "//KATEGORIE/ZELENY-CAJ///",
        searchParams:
          "utm_source=test&gclid=x&varianta=SKU-AbC&unknown=x&znacka=Pukka&strana=2",
      })
    ).toBe(
      "https://example.com:8443/kategorie/zeleny-caj?znacka=pukka&strana=2"
    )
  })

  it("canonicalizes two or more filters to the clean listing", () => {
    expect(
      buildCanonical({
        market: "cz",
        kind: "category",
        slug: "caje",
        searchParams: { kategorie: "bylinne", znacka: "pukka", strana: "3" },
      })
    ).toBe("https://herbatica.cz/kategorie/caje")
  })

  it("builds current, indexable alternates without x-default", () => {
    const alternates = buildAlternates([
      record(),
      record({ id: "url_2", market: "hu", slug: "zold-tea" }),
      record({ id: "url_3", market: "ro", status: "alias" }),
      record({ id: "url_4", market: "cz", indexable: false }),
    ])

    expect(alternates).toEqual([
      {
        hrefLang: "sk-SK",
        href: "https://herbatica.sk/produkty/zeleny-caj",
      },
      {
        hrefLang: "hu-HU",
        href: "https://herbatica.hu/termekek/zold-tea",
      },
    ])
    expect(
      alternates.some(({ hrefLang }) => hrefLang === ("x-default" as never))
    ).toBe(false)
  })
})
