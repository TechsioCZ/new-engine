// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import type { SourceReadResult } from "@/lib/url-registry/contracts"
import type {
  ActiveEntityRouteTarget,
  EntityUrlKind,
} from "@/lib/url-registry/model"
import {
  listPublicEntityProjections,
  listPublicStaticProjections,
} from "@/lib/url-registry/runtime/public-projections.server"
import {
  mapRequiredPublicEntitySlugs,
  mapRequiredPublicStaticHrefs,
  type ProjectionRequirement,
  type PublicEntitySlugMap,
  type PublicStaticHrefMap,
  type StaticProjectionRequirement,
} from "./public-entity-projection-map"

export type {
  PublicEntitySlugMap,
  PublicStaticHrefMap,
} from "./public-entity-projection-map"

const AVAILABLE_PROJECTION_BATCH_SIZE = 100

const readAvailableEntityProjectionBatch = async (input: {
  kind: EntityUrlKind
  market: ProjectionRequirement["market"]
  sourceIds: readonly string[]
}): Promise<SourceReadResult<readonly ActiveEntityRouteTarget[]>> =>
  listPublicEntityProjections({
    kind: input.kind,
    market: input.market,
    requiredSourceIds: input.sourceIds,
  })

export const readRequiredPublicEntitySlugs = async (
  requirement: ProjectionRequirement
): Promise<SourceReadResult<PublicEntitySlugMap>> => {
  const projections = await listPublicEntityProjections({
    kind: requirement.kind,
    market: requirement.market,
    requiredSourceIds: requirement.requiredSourceIds,
  })
  if (projections.kind !== "found") {
    return projections
  }
  return mapRequiredPublicEntitySlugs(requirement, projections.value)
}

export const readAvailablePublicEntitySlugs = async (
  requirement: ProjectionRequirement
): Promise<SourceReadResult<PublicEntitySlugMap>> => {
  const sourceIds = [...new Set(requirement.requiredSourceIds ?? [])]
  const values: ActiveEntityRouteTarget[] = []

  for (
    let offset = 0;
    offset < sourceIds.length;
    offset += AVAILABLE_PROJECTION_BATCH_SIZE
  ) {
    const projections = await readAvailableEntityProjectionBatch({
      kind: requirement.kind,
      market: requirement.market,
      sourceIds: sourceIds.slice(
        offset,
        offset + AVAILABLE_PROJECTION_BATCH_SIZE
      ),
    })
    if (projections.kind !== "found") {
      return projections
    }
    values.push(...projections.value)
  }

  return mapRequiredPublicEntitySlugs(
    { kind: requirement.kind, market: requirement.market },
    values
  )
}

export const readCompletePublicEntitySlugs = async (
  requirement: ProjectionRequirement
): Promise<SourceReadResult<PublicEntitySlugMap>> => {
  const projections = await listPublicEntityProjections({
    kind: requirement.kind,
    market: requirement.market,
  })
  if (projections.kind !== "found") {
    return projections
  }
  return mapRequiredPublicEntitySlugs(requirement, projections.value)
}

export const readRequiredPublicStaticHrefs = async (
  requirement: StaticProjectionRequirement
): Promise<SourceReadResult<PublicStaticHrefMap>> => {
  const projections = await listPublicStaticProjections(requirement.market)
  if (projections.kind !== "found") {
    return projections
  }
  return mapRequiredPublicStaticHrefs(requirement, projections.value)
}
