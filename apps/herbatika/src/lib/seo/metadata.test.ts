import { describe, expect, it } from "vitest"
import type { UrlRecord } from "@/lib/url/types"
import {
  buildEntityPageMetadata,
  buildIndexPageMetadata,
  buildNoindexMetadata,
} from "./metadata"

const record = (overrides: Partial<UrlRecord> = {}): UrlRecord => ({
  id: "sk-product",
  market: "sk",
  kind: "product",
  slug: "zeleny-caj",
  entityId: "product-1",
  equivalenceKey: "product:1",
  indexable: true,
  status: "current",
  aliasOf: null,
  updatedAt: new Date("2026-08-05T10:00:00.000Z"),
  ...overrides,
})

const alternates = [
  record(),
  record({ id: "cz-product", market: "cz" }),
  record({ id: "hu-product", market: "hu", slug: "zold-tea" }),
]

const entityMetadata = (
  overrides: Partial<Parameters<typeof buildEntityPageMetadata>[0]> = {}
) =>
  buildEntityPageMetadata({
    market: "sk",
    kind: "product",
    record: record(),
    alternates,
    title: "Green tea",
    description: "Tea description",
    ...overrides,
  })

describe("SEO metadata helpers", () => {
  it("builds absolute canonical, OG URL, and real hreflang including self", () => {
    const metadata = entityMetadata()

    expect(metadata).toMatchObject({
      title: "Green tea",
      description: "Tea description",
      robots: "index, follow",
      canonical: "https://herbatica.sk/produkty/zeleny-caj",
      openGraph: {
        url: "https://herbatica.sk/produkty/zeleny-caj",
        title: "Green tea",
        description: "Tea description",
      },
    })
    expect(metadata.hreflang).toEqual([
      {
        hrefLang: "sk-SK",
        href: "https://herbatica.sk/produkty/zeleny-caj",
      },
      {
        hrefLang: "cs-CZ",
        href: "https://herbatica.cz/produkty/zeleny-caj",
      },
      {
        hrefLang: "hu-HU",
        href: "https://herbatica.hu/termekek/zold-tea",
      },
    ])
    expect(metadata.hreflang).not.toContainEqual(
      expect.objectContaining({ hrefLang: "x-default" })
    )
  })

  it("adds self when the registry alternate lookup omitted it", () => {
    expect(
      entityMetadata({ alternates: alternates.slice(1) }).hreflang
    ).toContainEqual({
      hrefLang: "sk-SK",
      href: "https://herbatica.sk/produkty/zeleny-caj",
    })
  })

  it("ignores tracking parameters without changing indexability", () => {
    const metadata = entityMetadata({
      query: { utm_source: "newsletter", gclid: "click", fbclid: "social" },
    })
    expect(metadata.canonical).toBe("https://herbatica.sk/produkty/zeleny-caj")
    expect(metadata.robots).toBe("index, follow")
  })

  it("marks product variants noindex with no canonical, hreflang, or OG URL", () => {
    const metadata = entityMetadata({ query: { varianta: "SKU-AbC" } })
    expect(metadata.robots).toBe("noindex, follow")
    expect(metadata.canonical).toBeUndefined()
    expect(metadata.hreflang).toBeUndefined()
    expect(metadata.openGraph?.url).toBeUndefined()
  })

  it("keeps one indexable filter in a category canonical", () => {
    const category = record({ kind: "category", slug: "caje" })
    const metadata = entityMetadata({
      kind: "category",
      record: category,
      alternates: [category],
      query: { znacka: "Pukka" },
    })
    expect(metadata.canonical).toBe(
      "https://herbatica.sk/kategorie/caje?znacka=pukka"
    )
    expect(metadata.robots).toBe("index, follow")
    expect(metadata.openGraph?.url).toBe(metadata.canonical)
  })

  it.each([
    [{ znacka: "pukka", kategorie: "bylinne" }],
    [{ znacka: ["pukka", "herbatica"] }],
  ])("noindexes 2+ filters without divergent URL signals", (query) => {
    const category = record({ kind: "category", slug: "caje" })
    const metadata = entityMetadata({
      kind: "category",
      record: category,
      alternates: [category],
      query,
    })
    expect(metadata.robots).toBe("noindex, follow")
    expect(metadata.canonical).toBeUndefined()
    expect(metadata.hreflang).toBeUndefined()
    expect(metadata.openGraph?.url).toBeUndefined()
  })

  it("noindexes sorting without canonical, hreflang, or OG URL", () => {
    const category = record({ kind: "category", slug: "caje" })
    const metadata = entityMetadata({
      kind: "category",
      record: category,
      alternates: [category],
      query: { razeni: "cena", strana: "3" },
    })
    expect(metadata.robots).toBe("noindex, follow")
    expect(metadata.canonical).toBeUndefined()
    expect(metadata.hreflang).toBeUndefined()
    expect(metadata.openGraph?.url).toBeUndefined()
  })

  it("keeps page 2 self-canonical without prev/next metadata", () => {
    const category = record({ kind: "category", slug: "caje" })
    const metadata = entityMetadata({
      kind: "category",
      record: category,
      alternates: [category],
      query: { strana: "2" },
    })
    expect(metadata.canonical).toBe(
      "https://herbatica.sk/kategorie/caje?strana=2"
    )
    expect(metadata).not.toHaveProperty("pagination")
    expect(metadata.robots).toBe("index, follow")
  })

  it("builds index pagination canonicals and strips page 1", () => {
    const second = buildIndexPageMetadata({
      market: "hu",
      kind: "brand",
      page: 2,
    })
    expect(second.canonical).toBe("https://herbatica.hu/markak?strana=2")
    expect(second.openGraph?.url).toBe(second.canonical)
    expect(
      buildIndexPageMetadata({ market: "hu", kind: "brand", page: 1 }).canonical
    ).toBe("https://herbatica.hu/markak")
  })

  it("builds noindex metadata without canonical, hreflang, or OG URL", () => {
    const metadata = buildNoindexMetadata({ market: "ro", title: "Search" })
    expect(metadata).toMatchObject({
      title: "Search",
      robots: "noindex, follow",
    })
    expect(metadata.canonical).toBeUndefined()
    expect(metadata.hreflang).toBeUndefined()
    expect(metadata.openGraph?.url).toBeUndefined()
  })

  it("rejects a cross-market or cross-kind record", () => {
    expect(() => entityMetadata({ market: "cz", record: record() })).toThrow(
      "must match"
    )
  })
})
