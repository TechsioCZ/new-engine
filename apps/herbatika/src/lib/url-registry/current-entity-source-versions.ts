import type {
  SourceReadResult,
  UrlRegistry,
  UrlRegistryAuditRecord,
} from "./contracts"
import type { ActiveEntityRouteTarget } from "./model"

const AUDIT_PAGE_LIMIT = 100

export type CurrentEntitySourceVersion = Readonly<{
  routeId: string
  sourceVersion: string
}>

export type CurrentEntitySourceVersionDependencies = Pick<
  UrlRegistry,
  "listAuditRecords"
>

const auditMatchesCurrentProjection = (
  audit: UrlRegistryAuditRecord,
  projection: ActiveEntityRouteTarget
) =>
  audit.routeId === projection.route.id &&
  audit.resultVersion === projection.route.version &&
  audit.source.sourceSystem === projection.route.sourceSystem &&
  audit.source.sourceType === projection.route.sourceType &&
  audit.source.sourceId === projection.route.sourceId

type ProjectionIndexResult =
  | Readonly<{
      kind: "found"
      value: ReadonlyMap<string, ActiveEntityRouteTarget>
    }>
  | Readonly<{ causeCode: string; kind: "invalid-response" }>

const indexProjections = (
  projections: readonly ActiveEntityRouteTarget[]
): ProjectionIndexResult => {
  const value = new Map(
    projections.map((projection) => [projection.route.id, projection])
  )
  return value.size === projections.length
    ? { kind: "found", value }
    : {
        causeCode: "DUPLICATE_ENTITY_SOURCE_VERSION_CANDIDATE",
        kind: "invalid-response",
      }
}

const collectMatchingAudits = (
  audits: readonly UrlRegistryAuditRecord[],
  projectionByRouteId: ReadonlyMap<string, ActiveEntityRouteTarget>,
  sourceVersionByRouteId: Map<string, string>
) => {
  for (const audit of audits) {
    const projection = audit.routeId
      ? projectionByRouteId.get(audit.routeId)
      : undefined
    if (projection && auditMatchesCurrentProjection(audit, projection)) {
      sourceVersionByRouteId.set(
        projection.route.id,
        audit.source.sourceVersion
      )
    }
  }
}

const collectCurrentSourceVersions = async (
  projectionByRouteId: ReadonlyMap<string, ActiveEntityRouteTarget>,
  dependencies: CurrentEntitySourceVersionDependencies
): Promise<SourceReadResult<ReadonlyMap<string, string>>> => {
  const sourceVersionByRouteId = new Map<string, string>()
  const seenCursors = new Set<string>()
  let cursor: string | undefined

  do {
    const page = await dependencies.listAuditRecords({
      cursor,
      limit: AUDIT_PAGE_LIMIT,
    })
    if (page.kind !== "found") {
      return page
    }
    collectMatchingAudits(
      page.value.items,
      projectionByRouteId,
      sourceVersionByRouteId
    )

    const nextCursor = page.value.nextCursor
    if (nextCursor === null) {
      return { kind: "found", value: sourceVersionByRouteId }
    }
    if (seenCursors.has(nextCursor)) {
      return {
        causeCode: "INVALID_URL_REGISTRY_AUDIT_PAGINATION",
        kind: "invalid-response",
      }
    }
    seenCursors.add(nextCursor)
    cursor = nextCursor
  } while (cursor)

  return {
    causeCode: "INVALID_URL_REGISTRY_AUDIT_PAGINATION",
    kind: "invalid-response",
  }
}

export const readCurrentEntitySourceVersions = async (
  projections: readonly ActiveEntityRouteTarget[],
  dependencies: CurrentEntitySourceVersionDependencies
): Promise<SourceReadResult<readonly CurrentEntitySourceVersion[]>> => {
  if (projections.length === 0) {
    return { kind: "found", value: [] }
  }

  const projectionIndex = indexProjections(projections)
  if (projectionIndex.kind !== "found") {
    return projectionIndex
  }

  try {
    const collected = await collectCurrentSourceVersions(
      projectionIndex.value,
      dependencies
    )
    if (collected.kind !== "found") {
      return collected
    }
    const sourceVersionByRouteId = collected.value
    if (sourceVersionByRouteId.size !== projections.length) {
      return {
        causeCode: "MISSING_CURRENT_ENTITY_SOURCE_VERSION",
        kind: "invalid-response",
      }
    }

    return {
      kind: "found",
      value: projections.map((projection) => ({
        routeId: projection.route.id,
        sourceVersion: sourceVersionByRouteId.get(
          projection.route.id
        ) as string,
      })),
    }
  } catch {
    return { kind: "unavailable" }
  }
}
