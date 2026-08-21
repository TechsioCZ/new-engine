import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { ROUTES } from "@/lib/market/market-runtime-definitions"
import { buildAbsoluteUrl } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"
import type { StaticRouteSnapshot } from "@/lib/url-registry/model"
import { buildStaticSegments } from "@/lib/url-registry/static-route-segments"
import {
  latestSitemapTimestamp,
  SITEMAP_MAX_URLS,
  type SitemapDataDependencies,
  type SitemapEntryLoadResult,
  type SitemapSourceValidation,
} from "./sitemap-contract"
import type { SitemapUrl } from "./xml"

type ValidatedStaticMarket = Readonly<{
  byKey: ReadonlyMap<string, StaticRouteSnapshot>
  market: Market
  sourceUpdatedAtByRouteId: ReadonlyMap<string, string | null | undefined>
}>

const indexValidatedSources = (
  snapshots: readonly StaticRouteSnapshot[],
  validations: readonly SitemapSourceValidation[]
) => {
  const candidateRouteIds = new Set(
    snapshots.map((snapshot) => snapshot.route.id)
  )
  const byRouteId = new Map<string, string | null | undefined>()
  for (const validation of validations) {
    if (
      !candidateRouteIds.has(validation.routeId) ||
      byRouteId.has(validation.routeId) ||
      (validation.updatedAt !== undefined &&
        validation.updatedAt !== null &&
        typeof validation.updatedAt !== "string")
    ) {
      return null
    }
    byRouteId.set(validation.routeId, validation.updatedAt)
  }
  return byRouteId
}

const loadValidatedStaticMarket = async (
  market: Market,
  dependencies: SitemapDataDependencies
): Promise<
  | Readonly<{ kind: "found"; value: ValidatedStaticMarket }>
  | Exclude<SitemapEntryLoadResult, { kind: "found" }>
> => {
  const result = await dependencies.listStatic(market)
  if (result.kind !== "found") {
    return result
  }
  if (result.value.length > SITEMAP_MAX_URLS) {
    return {
      causeCode: "SITEMAP_KIND_LIMIT_EXCEEDED",
      kind: "invalid-response",
    }
  }
  const byKey = new Map<string, StaticRouteSnapshot>()
  for (const snapshot of result.value) {
    if (
      snapshot.route.market !== market ||
      byKey.has(snapshot.route.staticRouteKey)
    ) {
      return {
        causeCode: "INVALID_STATIC_ROUTE_PROJECTIONS",
        kind: "invalid-response",
      }
    }
    byKey.set(snapshot.route.staticRouteKey, snapshot)
  }
  const indexableSnapshots = result.value.filter(
    (snapshot) => snapshot.route.indexPolicy === "indexable"
  )
  const validation = await dependencies.validateStaticSources({
    market,
    sources: indexableSnapshots.map((snapshot) => ({
      routeId: snapshot.route.id,
      staticRouteKey: snapshot.route.staticRouteKey,
    })),
  })
  if (validation.kind !== "found") {
    return validation
  }
  const sourceUpdatedAtByRouteId = indexValidatedSources(
    indexableSnapshots,
    validation.value
  )
  return sourceUpdatedAtByRouteId
    ? {
        kind: "found",
        value: { byKey, market, sourceUpdatedAtByRouteId },
      }
    : {
        causeCode: "INVALID_STATIC_SOURCE_VALIDATION_RESPONSE",
        kind: "invalid-response",
      }
}

const buildStaticAlternates = (
  routeKey: string,
  markets: readonly ValidatedStaticMarket[]
) => {
  const entries: [string, string][] = []
  for (const market of markets) {
    const snapshot = market.byKey.get(routeKey)
    if (
      !snapshot ||
      snapshot.route.indexPolicy !== "indexable" ||
      !market.sourceUpdatedAtByRouteId.has(snapshot.route.id)
    ) {
      continue
    }
    const segments = buildStaticSegments(snapshot, market.byKey)
    if (!segments) {
      return null
    }
    entries.push([
      ROUTES[market.market].locale,
      buildAbsoluteUrl({ kind: "staticSnapshot", segments }, market.market)
        .href,
    ])
  }
  return Object.fromEntries(entries)
}

export const listStaticSitemapEntries = async (
  binding: MarketRuntimeBinding,
  dependencies: SitemapDataDependencies
): Promise<SitemapEntryLoadResult> => {
  const requestedMarkets = dependencies.listMarkets?.() ?? [binding.market]
  const markets = [...new Set<Market>([binding.market, ...requestedMarkets])]
  const loadedMarkets = await Promise.all(
    markets.map((market) => loadValidatedStaticMarket(market, dependencies))
  )
  const validatedMarkets: ValidatedStaticMarket[] = []
  for (const result of loadedMarkets) {
    if (result.kind !== "found") {
      return result
    }
    validatedMarkets.push(result.value)
  }
  const current = validatedMarkets.find(
    (market) => market.market === binding.market
  )
  if (!current) {
    return {
      causeCode: "MISSING_STATIC_SITEMAP_MARKET",
      kind: "invalid-response",
    }
  }

  const entries: SitemapUrl[] = []
  for (const snapshot of current.byKey.values()) {
    if (
      snapshot.route.indexPolicy !== "indexable" ||
      !current.sourceUpdatedAtByRouteId.has(snapshot.route.id)
    ) {
      continue
    }
    const segments = buildStaticSegments(snapshot, current.byKey)
    const alternates = buildStaticAlternates(
      snapshot.route.staticRouteKey,
      validatedMarkets
    )
    if (!(segments && alternates)) {
      return {
        causeCode: "INVALID_STATIC_ROUTE_HIERARCHY",
        kind: "invalid-response",
      }
    }
    entries.push({
      alternates,
      lastModified: latestSitemapTimestamp(
        snapshot.route.updatedAt,
        current.sourceUpdatedAtByRouteId.get(snapshot.route.id)
      ),
      location: buildAbsoluteUrl(
        { kind: "staticSnapshot", segments },
        binding.market
      ).href,
    })
  }
  return { kind: "found", value: entries }
}
