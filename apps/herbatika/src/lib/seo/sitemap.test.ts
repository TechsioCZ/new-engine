import { describe, expect, it } from "vitest"
import type { UrlRecord } from "@/lib/url/types"
import { InMemoryUrlRegistry } from "@/lib/url-registry/memory"
import {
  buildSitemapIndexXml,
  buildSitemapShardXml,
  parseSitemapShard,
} from "./sitemap"

const XML_DECLARATION_PATTERN = /^<\?xml version="1.0" encoding="UTF-8"\?>/

const current: UrlRecord = {
  id: "product-current",
  market: "sk",
  kind: "product",
  slug: "zeleny-caj",
  entityId: "product-1",
  equivalenceKey: "product:1",
  indexable: true,
  status: "current",
  aliasOf: null,
  updatedAt: new Date("2026-08-05T10:11:12.000Z"),
}

const registry = new InMemoryUrlRegistry([
  current,
  {
    ...current,
    id: "product-alias",
    slug: "stary-caj",
    status: "alias",
    aliasOf: current.id,
    updatedAt: new Date("2026-08-04T00:00:00.000Z"),
  },
  {
    ...current,
    id: "product-noindex",
    slug: "interny-produkt",
    entityId: "product-2",
    equivalenceKey: "product:2",
    indexable: false,
  },
  {
    ...current,
    id: "product-cz",
    market: "cz",
    slug: "cesky-caj",
    entityId: "product-3",
    equivalenceKey: "product:3",
  },
  {
    ...current,
    id: "category-current",
    kind: "category",
    slug: "caje",
    entityId: "category-1",
    equivalenceKey: "category:1",
  },
])

describe("sitemap XML", () => {
  it("publishes home and only non-empty per-kind shards", async () => {
    const xml = await buildSitemapIndexXml(registry, "sk")
    expect(xml).toContain(
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    )
    expect(xml).toContain("<loc>https://herbatica.sk/sitemaps/home-1.xml</loc>")
    expect(xml).toContain(
      "<loc>https://herbatica.sk/sitemaps/index-1.xml</loc>"
    )
    expect(xml).toContain(
      "<loc>https://herbatica.sk/sitemaps/product-1.xml</loc>"
    )
    expect(xml).toContain(
      "<loc>https://herbatica.sk/sitemaps/category-1.xml</loc>"
    )
    expect(xml).not.toContain("brand-1.xml")
    expect(xml).not.toContain("herbatica.cz")
  })

  it("publishes functional index roots and excludes embargoed campaigns", async () => {
    const xml = await buildSitemapShardXml(registry, "sk", {
      kind: "index",
      page: 1,
    })
    expect(xml).toContain("<loc>https://herbatica.sk/produkty</loc>")
    expect(xml).toContain("<loc>https://herbatica.sk/kategorie</loc>")
    expect(xml).toContain("<loc>https://herbatica.sk/znacky</loc>")
    expect(xml).toContain("<loc>https://herbatica.sk/kolekcie</loc>")
    expect(xml).toContain("<loc>https://herbatica.sk/poradna</loc>")
    expect(xml).not.toContain("/akcie")
    expect(parseSitemapShard("campaign-1.xml")).toBeNull()
  })

  it("contains only current, indexable records for requested market and kind", async () => {
    const xml = await buildSitemapShardXml(registry, "sk", {
      kind: "product",
      page: 1,
    })
    expect(xml).toMatch(XML_DECLARATION_PATTERN)
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    )
    expect(xml).toContain("<loc>https://herbatica.sk/produkty/zeleny-caj</loc>")
    expect(xml).toContain("<lastmod>2026-08-05T10:11:12.000Z</lastmod>")
    expect(xml).not.toContain("stary-caj")
    expect(xml).not.toContain("interny-produkt")
    expect(xml).not.toContain("cesky-caj")
    expect(xml).not.toContain("/kategorie/caje")
  })

  it("includes home without inventing a registry lastModified value", async () => {
    const xml = await buildSitemapShardXml(registry, "hu", {
      kind: "home",
      page: 1,
    })
    expect(xml).toContain("<loc>https://herbatica.hu</loc>")
    expect(xml).not.toContain("<lastmod>")
  })

  it("returns null for an empty or unknown valid shard", async () => {
    await expect(
      buildSitemapShardXml(registry, "sk", { kind: "brand", page: 1 })
    ).resolves.toBeNull()
    await expect(
      buildSitemapShardXml(registry, "sk", { kind: "home", page: 2 })
    ).resolves.toBeNull()
  })

  it("accepts only documented shard filenames", () => {
    expect(parseSitemapShard("product-1.xml")).toEqual({
      kind: "product",
      page: 1,
    })
    expect(parseSitemapShard("home-1.xml")).toEqual({ kind: "home", page: 1 })
    expect(parseSitemapShard("product.xml")).toBeNull()
    expect(parseSitemapShard("product-0.xml")).toBeNull()
    expect(parseSitemapShard("unknown-1.xml")).toBeNull()
  })
})
