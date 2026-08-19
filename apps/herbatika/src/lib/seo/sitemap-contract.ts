import type { Market } from "@/lib/url/types"
import type {
  ActiveEntityRouteTarget,
  EntityUrlKind,
  StaticRouteSnapshot,
} from "@/lib/url-registry/model"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import type { SitemapUrl } from "./xml"

export const SITEMAP_SHARD_TARGET = 100
export const SITEMAP_MAX_URLS = 20_000
export const SITEMAP_MAX_BYTES = 25 * 1024 * 1024

export const ENTITY_SITEMAP_KINDS = Object.freeze([
  "product",
  "category",
  "brand",
  "collection",
  "article",
  "page",
] as const satisfies readonly Exclude<EntityUrlKind, "campaign">[])

export const SITEMAP_KINDS = Object.freeze([
  "core",
  ...ENTITY_SITEMAP_KINDS,
  "static",
] as const)

export type SitemapKind = (typeof SITEMAP_KINDS)[number]

export type SitemapEntitySourceCandidate = Readonly<{
  publicSlug: string
  routeId: string
  sourceId: string
}>

export type SitemapStaticSourceCandidate = Readonly<{
  routeId: string
  staticRouteKey: string
}>

export type SitemapSourceValidation = Readonly<{
  routeId: string
  updatedAt?: string | null
}>

export type SitemapDataDependencies = Readonly<{
  countEntities(input: {
    kind: EntityUrlKind
    market: Market
  }): Promise<SourceReadResult<number>>
  listEntities(input: {
    kind: EntityUrlKind
    limit: number
    market: Market
    offset: number
  }): Promise<SourceReadResult<readonly ActiveEntityRouteTarget[]>>
  listStatic(
    market: Market
  ): Promise<SourceReadResult<readonly StaticRouteSnapshot[]>>
  validateEntitySources(input: {
    kind: Exclude<EntityUrlKind, "campaign">
    market: Market
    sources: readonly SitemapEntitySourceCandidate[]
  }): Promise<SourceReadResult<readonly SitemapSourceValidation[]>>
  validateStaticSources(input: {
    market: Market
    sources: readonly SitemapStaticSourceCandidate[]
  }): Promise<SourceReadResult<readonly SitemapSourceValidation[]>>
}>

export type SitemapEntryLoadResult = SourceReadResult<readonly SitemapUrl[]>

const SITEMAP_SHARD_NAME_PATTERN = /^([a-z]+)-([1-9][0-9]*)\.xml$/

const isSitemapKind = (value: string): value is SitemapKind =>
  SITEMAP_KINDS.some((kind) => kind === value)

export const parseSitemapShardName = (
  value: string
): Readonly<{ kind: SitemapKind; shard: number }> | null => {
  const match = SITEMAP_SHARD_NAME_PATTERN.exec(value)
  if (!match) {
    return null
  }
  const kind = match[1]
  const shard = Number(match[2])
  return kind && isSitemapKind(kind) && Number.isSafeInteger(shard)
    ? { kind, shard }
    : null
}

export const latestSitemapTimestamp = (
  left: string,
  right?: string | null
): string | undefined => {
  const leftTimestamp = Date.parse(left)
  const rightTimestamp = right ? Date.parse(right) : Number.NaN
  if (!Number.isFinite(leftTimestamp)) {
    return
  }
  return Number.isFinite(rightTimestamp) && rightTimestamp > leftTimestamp
    ? new Date(rightTimestamp).toISOString()
    : new Date(leftTimestamp).toISOString()
}
