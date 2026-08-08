import {
  buildAbsoluteUrl,
  buildIndexUrl,
  getMarketOrigin,
} from "@/lib/url/builder"
import {
  type Market,
  URL_KINDS,
  type UrlKind,
  type UrlRecord,
} from "@/lib/url/types"
import type { UrlRegistry } from "@/lib/url-registry/contracts"

export const SITEMAP_SHARD_SIZE = 10_000
export const MAX_SITEMAP_SHARDS_PER_KIND = 10
const SITEMAP_SCAN_LIMIT = SITEMAP_SHARD_SIZE * MAX_SITEMAP_SHARDS_PER_KIND
const REGISTRY_PAGE_SIZE = 100
const SITEMAP_SHARD_PATTERN = /^([a-z]+)-([1-9]\d*)\.xml$/

const INDEXABLE_INDEX_KINDS = [
  "product",
  "category",
  "brand",
  "collection",
  "article",
] as const satisfies readonly UrlKind[]
const SITEMAP_ENTITY_KINDS = URL_KINDS.filter(
  (kind): kind is Exclude<UrlKind, "campaign"> => kind !== "campaign"
)

export const SITEMAP_KINDS = ["home", "index", ...SITEMAP_ENTITY_KINDS] as const
export type SitemapKind = (typeof SITEMAP_KINDS)[number]
export type SitemapShard = { kind: SitemapKind; page: number }

export class SitemapLimitError extends Error {
  readonly name = "SitemapLimitError"
}

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const xmlDocument = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`

const urlsetDocument = (body: string): string =>
  xmlDocument(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`
  )

export function parseSitemapShard(value: string): SitemapShard | null {
  const match = SITEMAP_SHARD_PATTERN.exec(value)
  if (!match) {
    return null
  }
  const kind = match[1] ?? ""
  if (!SITEMAP_KINDS.includes(kind as SitemapKind)) {
    return null
  }
  const page = Number(match[2])
  if (!Number.isSafeInteger(page) || page > MAX_SITEMAP_SHARDS_PER_KIND) {
    return null
  }
  return { kind: kind as SitemapKind, page }
}

async function listCurrentIndexableRecords({
  registry,
  market,
  kind,
  start,
  limit,
}: {
  registry: UrlRegistry
  market: Market
  kind: UrlKind
  start: number
  limit: number
}): Promise<UrlRecord[]> {
  if (start < 0 || limit < 1 || start + limit > SITEMAP_SCAN_LIMIT) {
    throw new SitemapLimitError("Sitemap registry scan exceeded its bound")
  }
  const records: UrlRecord[] = []
  let offset = start

  while (records.length < limit) {
    const page = await registry.list({
      market,
      kind,
      status: "current",
      indexable: true,
      orderBy: "route",
      limit: Math.min(REGISTRY_PAGE_SIZE, limit - records.length),
      offset,
    })
    records.push(...page.records)
    if (!page.hasMore) {
      return records
    }
    if (page.records.length === 0) {
      throw new SitemapLimitError("Registry pagination did not advance")
    }
    offset += page.records.length
  }
  return records
}

export async function buildSitemapIndexXml(
  registry: UrlRegistry,
  market: Market
): Promise<string> {
  const origin = getMarketOrigin(market)
  const shardNames = ["home-1.xml", "index-1.xml"]

  for (const kind of SITEMAP_ENTITY_KINDS) {
    const count = await registry.count({
      market,
      kind,
      status: "current",
      indexable: true,
    })
    if (count > SITEMAP_SCAN_LIMIT) {
      throw new SitemapLimitError("Sitemap registry count exceeded its bound")
    }
    const shardCount = Math.ceil(count / SITEMAP_SHARD_SIZE)
    for (let page = 1; page <= shardCount; page += 1) {
      shardNames.push(`${kind}-${page}.xml`)
    }
  }

  const entries = shardNames
    .map(
      (shard) =>
        `  <sitemap><loc>${escapeXml(`${origin}/sitemaps/${shard}`)}</loc></sitemap>`
    )
    .join("\n")
  return xmlDocument(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`
  )
}

export async function buildSitemapShardXml(
  registry: UrlRegistry,
  market: Market,
  shard: SitemapShard
): Promise<string | null> {
  if (shard.kind === "home") {
    if (shard.page !== 1) {
      return null
    }
    return urlsetDocument(
      `  <url><loc>${escapeXml(getMarketOrigin(market))}</loc></url>`
    )
  }

  if (shard.kind === "index") {
    if (shard.page !== 1) {
      return null
    }
    const origin = getMarketOrigin(market)
    const entries = INDEXABLE_INDEX_KINDS.map(
      (kind) =>
        `  <url><loc>${escapeXml(`${origin}${buildIndexUrl({ market, kind })}`)}</loc></url>`
    ).join("\n")
    return urlsetDocument(entries)
  }

  const start = (shard.page - 1) * SITEMAP_SHARD_SIZE
  const records = await listCurrentIndexableRecords({
    registry,
    market,
    kind: shard.kind,
    start,
    limit: SITEMAP_SHARD_SIZE,
  })
  if (records.length === 0) {
    return null
  }
  const entries = records
    .map(
      (record) =>
        `  <url><loc>${escapeXml(buildAbsoluteUrl(record))}</loc><lastmod>${record.updatedAt.toISOString()}</lastmod></url>`
    )
    .join("\n")

  return urlsetDocument(entries)
}
