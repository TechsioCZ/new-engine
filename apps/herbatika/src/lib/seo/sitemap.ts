import { buildAbsoluteUrl, getMarketOrigin } from "@/lib/url/builder"
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

export const SITEMAP_KINDS = ["home", ...URL_KINDS] as const
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

async function listCurrentIndexableRecords(
  registry: UrlRegistry,
  market: Market,
  kind: UrlKind
): Promise<UrlRecord[]> {
  const records: UrlRecord[] = []
  let offset = 0
  let scanned = 0

  while (true) {
    const page = await registry.list({
      market,
      kind,
      status: "current",
      limit: REGISTRY_PAGE_SIZE,
      offset,
    })
    scanned += page.records.length
    if (scanned > SITEMAP_SCAN_LIMIT) {
      throw new SitemapLimitError("Sitemap registry scan exceeded its bound")
    }

    for (const record of page.records) {
      if (
        record.market === market &&
        record.kind === kind &&
        record.status === "current" &&
        record.indexable
      ) {
        records.push(record)
      }
    }

    if (!page.hasMore) {
      return records.sort((left, right) =>
        buildAbsoluteUrl(left).localeCompare(buildAbsoluteUrl(right))
      )
    }
    if (page.records.length === 0 || scanned === SITEMAP_SCAN_LIMIT) {
      throw new SitemapLimitError("Registry pagination exceeded its bound")
    }
    offset += page.records.length
  }
}

export async function buildSitemapIndexXml(
  registry: UrlRegistry,
  market: Market
): Promise<string> {
  const origin = getMarketOrigin(market)
  const shardNames = ["home-1.xml"]

  for (const kind of URL_KINDS) {
    const count = (await listCurrentIndexableRecords(registry, market, kind))
      .length
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
    return xmlDocument(
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escapeXml(getMarketOrigin(market))}</loc></url>\n</urlset>`
    )
  }

  const records = await listCurrentIndexableRecords(
    registry,
    market,
    shard.kind
  )
  const start = (shard.page - 1) * SITEMAP_SHARD_SIZE
  if (start >= records.length) {
    return null
  }
  const entries = records
    .slice(start, start + SITEMAP_SHARD_SIZE)
    .map(
      (record) =>
        `  <url><loc>${escapeXml(buildAbsoluteUrl(record))}</loc><lastmod>${record.updatedAt.toISOString()}</lastmod></url>`
    )
    .join("\n")

  return xmlDocument(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`
  )
}
