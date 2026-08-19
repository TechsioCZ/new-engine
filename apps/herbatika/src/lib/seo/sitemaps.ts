import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { classifySeo } from "@/lib/url/public-seo"
import { buildAbsoluteUrl } from "@/lib/url/public-url"
import type { QueryRouteKind } from "@/lib/url/query-normalizer"
import {
  SITEMAP_MAX_BYTES,
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

export const listSitemapEntries = (
  binding: MarketRuntimeBinding,
  kind: SitemapKind,
  dependencies: SitemapDataDependencies
): Promise<SitemapEntryLoadResult> => {
  if (!isCleanRouteSitemapEligible(kind)) {
    return Promise.resolve({ kind: "found", value: [] })
  }
  if (kind === "core") {
    return Promise.resolve(listCoreEntries(binding))
  }
  return kind === "static"
    ? listStaticSitemapEntries(binding, dependencies)
    : listEntitySitemapEntries(binding, kind, dependencies)
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
