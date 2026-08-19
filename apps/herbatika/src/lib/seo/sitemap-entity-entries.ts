import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { buildAbsoluteUrl } from "@/lib/url/public-url"
import type {
  ActiveEntityRouteTarget,
  EntityUrlKind,
} from "@/lib/url-registry/model"
import {
  latestSitemapTimestamp,
  SITEMAP_MAX_URLS,
  type SitemapDataDependencies,
  type SitemapEntryLoadResult,
  type SitemapSourceValidation,
} from "./sitemap-contract"

const indexValidatedSources = (
  projections: readonly ActiveEntityRouteTarget[],
  validations: readonly SitemapSourceValidation[]
) => {
  const candidateRouteIds = new Set(
    projections.map((projection) => projection.route.id)
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

export const listEntitySitemapEntries = async (
  binding: MarketRuntimeBinding,
  kind: Exclude<EntityUrlKind, "campaign">,
  dependencies: SitemapDataDependencies
): Promise<SitemapEntryLoadResult> => {
  const projectionResult = await dependencies.listEntities({
    kind,
    market: binding.market,
  })
  if (projectionResult.kind !== "found") {
    return projectionResult
  }
  const projections = projectionResult.value.filter(
    (projection) => projection.route.indexPolicy === "indexable"
  )
  if (projections.length > SITEMAP_MAX_URLS) {
    return {
      causeCode: "SITEMAP_KIND_LIMIT_EXCEEDED",
      kind: "invalid-response",
    }
  }

  const validation = await dependencies.validateEntitySources({
    kind,
    market: binding.market,
    sources: projections.map((projection) => ({
      publicSlug: projection.currentSlug.normalizedSlug,
      routeId: projection.route.id,
      sourceId: projection.route.sourceId,
    })),
  })
  if (validation.kind !== "found") {
    return validation
  }
  const sourceUpdatedAtByRouteId = indexValidatedSources(
    projections,
    validation.value
  )
  if (!sourceUpdatedAtByRouteId) {
    return {
      causeCode: "INVALID_SITEMAP_SOURCE_VALIDATION_RESPONSE",
      kind: "invalid-response",
    }
  }

  return {
    kind: "found",
    value: projections.flatMap((projection) =>
      sourceUpdatedAtByRouteId.has(projection.route.id)
        ? [
            {
              lastModified: latestSitemapTimestamp(
                projection.route.updatedAt,
                sourceUpdatedAtByRouteId.get(projection.route.id)
              ),
              location: buildAbsoluteUrl(
                { kind, slug: projection.currentSlug.normalizedSlug },
                binding.market
              ).href,
            },
          ]
        : []
    ),
  }
}
