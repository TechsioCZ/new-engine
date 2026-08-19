import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { classifySeo } from "@/lib/url/public-seo"
import { buildAbsoluteUrl } from "@/lib/url/public-url"
import type { QueryRouteKind } from "@/lib/url/query-normalizer"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import {
  SITEMAP_MAX_BYTES,
  SITEMAP_MAX_URLS,
  SITEMAP_SHARD_TARGET,
  type SitemapDataDependencies,
  type SitemapEntryLoadResult,
  type SitemapKind,
} from "./sitemap-contract"
import { listEntitySitemapEntries } from "./sitemap-entity-entries"
import { listStaticSitemapEntries } from "./sitemap-static-entries"
import type { SitemapUrl } from "./xml"

const SEO_ROUTE_KIND_BY_SITEMAP_KIND = {
  core: "homepage",
  product: "product-detail",
  category: "category-detail",
  brand: "brand-detail",
  collection: "collection-detail",
  article: "advice-article",
  page: "information-detail",
  static: "static-page",
} as const satisfies Record<SitemapKind, QueryRouteKind>

const CORE_ROUTES = Object.freeze([
  { routeKind: "homepage", target: { kind: "home" } },
  { routeKind: "product-index", target: { kind: "product" } },
  { routeKind: "category-index", target: { kind: "category" } },
  { routeKind: "brand-index", target: { kind: "brand" } },
  { routeKind: "collection-index", target: { kind: "collection" } },
  { routeKind: "advice-index", target: { kind: "article" } },
] as const)

const isCleanRouteSitemapEligible = (kind: SitemapKind): boolean =>
  classifySeo({
    canonicalRawQuery: "",
    routeKind: SEO_ROUTE_KIND_BY_SITEMAP_KIND[kind],
    values: {},
  }).sitemapEligible

const listCoreEntries = (
  binding: MarketRuntimeBinding
): SitemapEntryLoadResult => ({
  kind: "found",
  value: CORE_ROUTES.filter(
    ({ routeKind }) =>
      classifySeo({ canonicalRawQuery: "", routeKind, values: {} })
        .sitemapEligible
  ).map(({ target }) => ({
    location: buildAbsoluteUrl(target, binding.market).href,
  })),
})

const validateSitemapEntryCount = (
  result: SourceReadResult<number>
): SourceReadResult<number> => {
  if (result.kind !== "found") {
    return result
  }
  return Number.isSafeInteger(result.value) &&
    result.value >= 0 &&
    result.value <= SITEMAP_MAX_URLS
    ? result
    : {
        causeCode: "SITEMAP_KIND_LIMIT_EXCEEDED",
        kind: "invalid-response",
      }
}

export const listSitemapEntries = (
  binding: MarketRuntimeBinding,
  kind: SitemapKind,
  dependencies: SitemapDataDependencies,
  page: Readonly<{ limit: number; offset: number }> = {
    limit: SITEMAP_SHARD_TARGET,
    offset: 0,
  }
): Promise<SitemapEntryLoadResult> => {
  if (!isCleanRouteSitemapEligible(kind)) {
    return Promise.resolve({ kind: "found", value: [] })
  }
  if (kind === "core") {
    return Promise.resolve(listCoreEntries(binding))
  }
  return kind === "static"
    ? listStaticSitemapEntries(binding, dependencies)
    : listEntitySitemapEntries(binding, kind, dependencies, page)
}

export const countSitemapEntries = async (
  binding: MarketRuntimeBinding,
  kind: SitemapKind,
  dependencies: SitemapDataDependencies
): Promise<SourceReadResult<number>> => {
  if (kind === "core") {
    const result = listCoreEntries(binding)
    return validateSitemapEntryCount(
      result.kind === "found"
        ? { kind: "found", value: result.value.length }
        : result
    )
  }
  if (kind === "static") {
    const result = await listStaticSitemapEntries(binding, dependencies)
    return validateSitemapEntryCount(
      result.kind === "found"
        ? { kind: "found", value: result.value.length }
        : result
    )
  }
  return validateSitemapEntryCount(
    await dependencies.countEntities({ kind, market: binding.market })
  )
}

export const listSitemapShardEntries = async (
  binding: MarketRuntimeBinding,
  kind: SitemapKind,
  shard: number,
  dependencies: SitemapDataDependencies
): Promise<SitemapEntryLoadResult> => {
  const offset = (shard - 1) * SITEMAP_SHARD_TARGET
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset >= SITEMAP_MAX_URLS
  ) {
    return { kind: "missing" }
  }
  const result = await listSitemapEntries(binding, kind, dependencies, {
    limit: SITEMAP_SHARD_TARGET,
    offset,
  })
  if (result.kind !== "found") {
    return result
  }
  if (kind === "core" || kind === "static") {
    const entries = shardSitemapEntries(result.value)[shard - 1]
    return entries ? { kind: "found", value: entries } : { kind: "missing" }
  }
  return result.value.length > 0 ? result : { kind: "missing" }
}

export const shardSitemapEntries = (
  entries: readonly SitemapUrl[]
): readonly (readonly SitemapUrl[])[] => {
  const shards: SitemapUrl[][] = []
  for (
    let offset = 0;
    offset < entries.length;
    offset += SITEMAP_SHARD_TARGET
  ) {
    shards.push(entries.slice(offset, offset + SITEMAP_SHARD_TARGET))
  }
  return shards
}

export const assertSitemapXmlBounded = (xml: string): boolean =>
  new TextEncoder().encode(xml).byteLength <= SITEMAP_MAX_BYTES
