import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { buildAbsoluteUrl } from "@/lib/url/public-url"
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

export const listStaticSitemapEntries = async (
  binding: MarketRuntimeBinding,
  dependencies: SitemapDataDependencies
): Promise<SitemapEntryLoadResult> => {
  const result = await dependencies.listStatic(binding.market)
  if (result.kind !== "found") {
    return result
  }
  if (result.value.length > SITEMAP_MAX_URLS) {
    return {
      causeCode: "SITEMAP_KIND_LIMIT_EXCEEDED",
      kind: "invalid-response",
    }
  }

  const byKey = new Map(
    result.value.map((snapshot) => [snapshot.route.staticRouteKey, snapshot])
  )
  const indexableSnapshots = result.value.filter(
    (snapshot) => snapshot.route.indexPolicy === "indexable"
  )
  const validation = await dependencies.validateStaticSources({
    market: binding.market,
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
  if (!sourceUpdatedAtByRouteId) {
    return {
      causeCode: "INVALID_STATIC_SOURCE_VALIDATION_RESPONSE",
      kind: "invalid-response",
    }
  }

  const entries: SitemapUrl[] = []
  for (const snapshot of indexableSnapshots) {
    if (!sourceUpdatedAtByRouteId.has(snapshot.route.id)) {
      continue
    }
    const segments = buildStaticSegments(snapshot, byKey)
    if (!segments) {
      return {
        causeCode: "INVALID_STATIC_ROUTE_HIERARCHY",
        kind: "invalid-response",
      }
    }
    entries.push({
      lastModified: latestSitemapTimestamp(
        snapshot.route.updatedAt,
        sourceUpdatedAtByRouteId.get(snapshot.route.id)
      ),
      location: buildAbsoluteUrl(
        { kind: "staticSnapshot", segments },
        binding.market
      ).href,
    })
  }
  return { kind: "found", value: entries }
}
