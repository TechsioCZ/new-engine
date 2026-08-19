import { buildPath } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import type {
  ActiveEntityRouteTarget,
  EntityUrlKind,
  StaticRouteSnapshot,
} from "@/lib/url-registry/model"
import { buildStaticSegments } from "@/lib/url-registry/static-route-segments"

export type PublicEntitySlugMap = Readonly<Record<string, string>>
export type PublicStaticHrefMap = Readonly<Record<string, string>>

export type RequiredEntityIdentity = Readonly<{
  sourceId: string
  sourceSystem: string
  sourceType: string
}>

export type ProjectionRequirement = Readonly<{
  kind: EntityUrlKind
  market: Market
  requiredSourceIdentities?: readonly RequiredEntityIdentity[]
  requiredSourceIds?: readonly string[]
  rejectUnexpectedSourceIds?: boolean
}>

export type StaticProjectionRequirement = Readonly<{
  market: Market
  requiredRouteKeys: readonly string[]
}>

const causeKind = (kind: EntityUrlKind) => kind.toUpperCase()

const invalidProjection = (
  requirement: ProjectionRequirement,
  projection: ActiveEntityRouteTarget
) => {
  const { currentSlug, route } = projection
  return (
    route.kind !== requirement.kind ||
    currentSlug.kind !== requirement.kind ||
    route.market !== requirement.market ||
    currentSlug.market !== requirement.market ||
    route.id !== currentSlug.routeId ||
    route.status !== "active" ||
    !route.sourceId ||
    !currentSlug.normalizedSlug
  )
}

const projectionFailure = (
  requirement: ProjectionRequirement,
  reason: "DUPLICATE" | "INVALID" | "MISSING" | "ORPHANED"
): SourceReadResult<never> => ({
  causeCode: `${reason}_${causeKind(requirement.kind)}_PUBLIC_PROJECTION`,
  kind: "invalid-response",
})

const indexRequiredIdentities = (
  requirement: ProjectionRequirement
): SourceReadResult<ReadonlyMap<string, RequiredEntityIdentity>> => {
  const identitiesById = new Map<string, RequiredEntityIdentity>()
  for (const identity of requirement.requiredSourceIdentities ?? []) {
    const existing = identitiesById.get(identity.sourceId)
    if (
      !identity.sourceId ||
      identity.sourceType !== requirement.kind ||
      (existing &&
        (existing.sourceSystem !== identity.sourceSystem ||
          existing.sourceType !== identity.sourceType))
    ) {
      return {
        causeCode: `INVALID_${causeKind(requirement.kind)}_PUBLIC_PROJECTION_REQUIREMENT`,
        kind: "invalid-response",
      }
    }
    identitiesById.set(identity.sourceId, identity)
  }
  return { kind: "found", value: identitiesById }
}

const mapEntityProjectionSlugs = (
  requirement: ProjectionRequirement,
  projections: readonly ActiveEntityRouteTarget[],
  requiredIdentitiesById: ReadonlyMap<string, RequiredEntityIdentity>
): SourceReadResult<Record<string, string>> => {
  const publicSlugsById: Record<string, string> = {}
  for (const projection of projections) {
    const { currentSlug, route } = projection
    if (invalidProjection(requirement, projection)) {
      return projectionFailure(requirement, "INVALID")
    }

    const requiredIdentity = requiredIdentitiesById.get(route.sourceId)
    if (
      requiredIdentity &&
      (route.sourceSystem !== requiredIdentity.sourceSystem ||
        route.sourceType !== requiredIdentity.sourceType)
    ) {
      return {
        causeCode: `MISMATCHED_${causeKind(requirement.kind)}_PUBLIC_PROJECTION_IDENTITY`,
        kind: "invalid-response",
      }
    }
    if (publicSlugsById[route.sourceId] !== undefined) {
      return projectionFailure(requirement, "DUPLICATE")
    }
    publicSlugsById[route.sourceId] = currentSlug.normalizedSlug
  }
  return { kind: "found", value: publicSlugsById }
}

export const mapRequiredPublicEntitySlugs = (
  requirement: ProjectionRequirement,
  projections: readonly ActiveEntityRouteTarget[]
): SourceReadResult<PublicEntitySlugMap> => {
  const requiredIdentities = indexRequiredIdentities(requirement)
  if (requiredIdentities.kind !== "found") {
    return requiredIdentities
  }
  const mappedProjections = mapEntityProjectionSlugs(
    requirement,
    projections,
    requiredIdentities.value
  )
  if (mappedProjections.kind !== "found") {
    return mappedProjections
  }

  const publicSlugsById = mappedProjections.value
  const requiredSourceIds = new Set([
    ...(requirement.requiredSourceIds ?? []),
    ...requiredIdentities.value.keys(),
  ])
  for (const sourceId of requiredSourceIds) {
    if (!sourceId || publicSlugsById[sourceId] === undefined) {
      return projectionFailure(requirement, "MISSING")
    }
  }

  const hasOrphanedProjection =
    requirement.rejectUnexpectedSourceIds === true &&
    Object.keys(publicSlugsById).some(
      (sourceId) => !requiredSourceIds.has(sourceId)
    )
  if (hasOrphanedProjection) {
    return projectionFailure(requirement, "ORPHANED")
  }

  return { kind: "found", value: publicSlugsById }
}

const indexActiveStaticSnapshots = (
  requirement: StaticProjectionRequirement,
  snapshots: readonly StaticRouteSnapshot[]
): SourceReadResult<ReadonlyMap<string, StaticRouteSnapshot>> => {
  const activeByKey = new Map<string, StaticRouteSnapshot>()
  for (const snapshot of snapshots) {
    const { currentPath, route } = snapshot
    if (
      snapshot.projectionType !== "static" ||
      route.targetType !== "static" ||
      route.kind !== "static" ||
      route.market !== requirement.market ||
      currentPath.market !== requirement.market ||
      currentPath.routeKey !== route.staticRouteKey ||
      currentPath.disposition !== "current"
    ) {
      return {
        causeCode: "INVALID_STATIC_PUBLIC_PROJECTION",
        kind: "invalid-response",
      }
    }
    if (route.status !== "active") {
      continue
    }
    if (activeByKey.has(route.staticRouteKey)) {
      return {
        causeCode: "DUPLICATE_STATIC_PUBLIC_PROJECTION",
        kind: "invalid-response",
      }
    }
    activeByKey.set(route.staticRouteKey, snapshot)
  }
  return { kind: "found", value: activeByKey }
}

const buildStaticHrefMap = (
  requirement: StaticProjectionRequirement,
  activeByKey: ReadonlyMap<string, StaticRouteSnapshot>
): SourceReadResult<PublicStaticHrefMap> => {
  const hrefsByRouteKey: Record<string, string> = {}
  for (const [routeKey, snapshot] of activeByKey) {
    const segments = buildStaticSegments(snapshot, activeByKey)
    if (!segments) {
      return {
        causeCode: "INVALID_STATIC_PUBLIC_PROJECTION_HIERARCHY",
        kind: "invalid-response",
      }
    }
    try {
      hrefsByRouteKey[routeKey] = buildPath(
        { kind: "staticSnapshot", segments },
        requirement.market
      )
    } catch {
      return {
        causeCode: "INVALID_STATIC_PUBLIC_PROJECTION_PATH",
        kind: "invalid-response",
      }
    }
  }
  return { kind: "found", value: hrefsByRouteKey }
}

export const mapRequiredPublicStaticHrefs = (
  requirement: StaticProjectionRequirement,
  snapshots: readonly StaticRouteSnapshot[]
): SourceReadResult<PublicStaticHrefMap> => {
  const activeSnapshots = indexActiveStaticSnapshots(requirement, snapshots)
  if (activeSnapshots.kind !== "found") {
    return activeSnapshots
  }
  const hrefs = buildStaticHrefMap(requirement, activeSnapshots.value)
  if (hrefs.kind !== "found") {
    return hrefs
  }

  for (const routeKey of new Set(requirement.requiredRouteKeys)) {
    if (!routeKey || hrefs.value[routeKey] === undefined) {
      return {
        causeCode: "MISSING_STATIC_PUBLIC_PROJECTION",
        kind: "invalid-response",
      }
    }
  }

  return hrefs
}
