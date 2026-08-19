// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import type { SourceReadResult } from "@/lib/url-registry/contracts"
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
