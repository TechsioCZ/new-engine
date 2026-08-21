import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { ROUTES } from "@/lib/market/market-runtime-definitions"
import { buildAlternates } from "@/lib/url/public-route-api"
import { buildAbsoluteUrl } from "@/lib/url/public-url"
import type {
  ActiveEntityRouteTarget,
  EntityUrlKind,
} from "@/lib/url-registry/model"
import {
  latestSitemapTimestamp,
  SITEMAP_MAX_URLS,
  type SitemapDataDependencies,
  type SitemapEntitySourceCandidate,
  type SitemapEntryLoadResult,
  type SitemapSourceValidation,
} from "./sitemap-contract"
import type { SitemapUrl } from "./xml"

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

const buildSourceCandidates = async (
  projections: readonly ActiveEntityRouteTarget[],
  dependencies: SitemapDataDependencies
) => {
  const result = await dependencies.readEntitySourceVersions(projections)
  if (result.kind !== "found") {
    return result
  }
  const candidateRouteIds = new Set(
    projections.map((projection) => projection.route.id)
  )
  const versionByRouteId = new Map<string, string>()
  for (const version of result.value) {
    if (
      !candidateRouteIds.has(version.routeId) ||
      versionByRouteId.has(version.routeId) ||
      typeof version.sourceVersion !== "string" ||
      version.sourceVersion.length === 0
    ) {
      return {
        causeCode: "INVALID_SITEMAP_SOURCE_VERSION_RESPONSE",
        kind: "invalid-response" as const,
      }
    }
    versionByRouteId.set(version.routeId, version.sourceVersion)
  }
  if (versionByRouteId.size !== projections.length) {
    return {
      causeCode: "MISSING_SITEMAP_SOURCE_VERSION",
      kind: "invalid-response" as const,
    }
  }
  return {
    kind: "found" as const,
    value: projections.map(
      (projection): SitemapEntitySourceCandidate => ({
        publicSlug: projection.currentSlug.normalizedSlug,
        routeId: projection.route.id,
        sourceId: projection.route.sourceId,
        sourceVersion: versionByRouteId.get(projection.route.id) as string,
      })
    ),
  }
}

const loadValidatedEntitySource = async (
  target: ActiveEntityRouteTarget,
  dependencies: SitemapDataDependencies
) => {
  const candidates = await buildSourceCandidates([target], dependencies)
  if (candidates.kind !== "found") {
    return candidates
  }
  const result = await dependencies.validateEntitySources({
    kind: target.route.kind,
    market: target.route.market,
    sources: candidates.value,
  })
  if (result.kind !== "found") {
    return result
  }
  return result.value.some(
    (validation) => validation.routeId === target.route.id
  )
    ? { kind: "found" as const, value: target }
    : { kind: "missing" as const }
}

const buildEntitySitemapAlternates = (
  projection: ActiveEntityRouteTarget,
  dependencies: SitemapDataDependencies
) => {
  if (!dependencies.findEntityEquivalents) {
    return Promise.resolve({
      kind: "found" as const,
      value: {
        [ROUTES[projection.route.market].locale]: buildAbsoluteUrl(
          {
            kind: projection.route.kind,
            slug: projection.currentSlug.normalizedSlug,
          },
          projection.route.market
        ).href,
      },
    })
  }
  return buildAlternates({
    findActiveEquivalents: dependencies.findEntityEquivalents,
    loadSource: (target) => loadValidatedEntitySource(target, dependencies),
    target: projection,
  })
}

export const listEntitySitemapEntries = async (
  binding: MarketRuntimeBinding,
  kind: EntityUrlKind,
  dependencies: SitemapDataDependencies,
  page: Readonly<{ limit: number; offset: number }>
): Promise<SitemapEntryLoadResult> => {
  const projectionResult = await dependencies.listEntities({
    kind,
    limit: page.limit,
    market: binding.market,
    offset: page.offset,
  })
  if (projectionResult.kind !== "found") {
    return projectionResult
  }
  const projections = projectionResult.value
  if (
    projections.length > page.limit ||
    page.offset + projections.length > SITEMAP_MAX_URLS ||
    projections.some(
      (projection) => projection.route.indexPolicy !== "indexable"
    )
  ) {
    return {
      causeCode: "SITEMAP_KIND_LIMIT_EXCEEDED",
      kind: "invalid-response",
    }
  }

  const candidates = await buildSourceCandidates(projections, dependencies)
  if (candidates.kind !== "found") {
    return candidates
  }
  const validation = await dependencies.validateEntitySources({
    kind,
    market: binding.market,
    sources: candidates.value,
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

  const entries: SitemapUrl[] = []
  for (const projection of projections) {
    if (!sourceUpdatedAtByRouteId.has(projection.route.id)) {
      continue
    }
    const alternates = await buildEntitySitemapAlternates(
      projection,
      dependencies
    )
    if (alternates.kind !== "found") {
      return alternates
    }
    entries.push({
      alternates: alternates.value,
      lastModified: latestSitemapTimestamp(
        projection.route.updatedAt,
        sourceUpdatedAtByRouteId.get(projection.route.id)
      ),
      location: buildAbsoluteUrl(
        { kind, slug: projection.currentSlug.normalizedSlug },
        binding.market
      ).href,
    })
  }
  return { kind: "found", value: entries }
}
