import type {
  EntityRouteSnapshot,
  StaticRouteSnapshot,
  UrlRegistry,
} from "../contracts"
import { createUrlRegistrySourceIdentity } from "../source-identity"
import { hashPopulationManifest } from "./manifest"
import {
  POPULATION_MARKETS,
  type PopulationEntity,
  type PopulationManifest,
} from "./manifest-contracts"
import {
  assertPopulationPaths,
  readActivePopulationStaticKeys,
  readAllActivePopulationEntityKeys,
} from "./population-plan-reads"
import {
  buildPopulationStaticTaxonomy,
  type PopulationStaticRoute,
} from "./static-taxonomy"

export type PopulationBlocker = Readonly<{
  code:
    | "EXISTING_ROUTE_CONFLICT"
    | "INCOMPLETE_REGISTRY_READ"
    | "UNMANAGED_ACTIVE_ROUTE"
  identity: string
  message: string
}>

export type CreateEntityAction = Readonly<{
  entity: PopulationEntity
  kind: "create-entity"
}>

export type CreateStaticAction = Readonly<{
  kind: "create-static"
  route: PopulationStaticRoute
}>

export type PopulationPlan = Readonly<{
  blockers: readonly PopulationBlocker[]
  creates: readonly (CreateEntityAction | CreateStaticAction)[]
  manifestHash: `sha256:${string}`
  noops: readonly string[]
  retirementPlan: readonly string[]
  totals: Readonly<{
    desiredEntities: number
    desiredStatics: number
  }>
}>

type MutablePopulationPlan = {
  blockers: PopulationBlocker[]
  creates: (CreateEntityAction | CreateStaticAction)[]
  noops: string[]
}

export const identityForPopulationEntity = (entity: PopulationEntity) =>
  createUrlRegistrySourceIdentity(entity.kind, entity.sourceId)

export const populationEntityKey = (entity: PopulationEntity) =>
  `${entity.market}:${entity.kind}:${entity.sourceId}`

export const populationStaticKey = (route: PopulationStaticRoute) =>
  `${route.market}:static:${route.routeKey}`

const entityMatches = (
  entity: PopulationEntity,
  snapshot: EntityRouteSnapshot
) =>
  snapshot.route.status === "active" &&
  snapshot.route.kind === entity.kind &&
  snapshot.route.equivalenceKey === entity.equivalenceKey &&
  snapshot.route.indexPolicy === entity.indexPolicy &&
  snapshot.currentSlug.normalizedSlug === entity.publicSlug &&
  snapshot.currentSlug.normalizationVersion === 1

const staticMatches = (
  route: PopulationStaticRoute,
  snapshot: StaticRouteSnapshot
) =>
  snapshot.route.status === "active" &&
  snapshot.route.equivalenceKey === route.equivalenceKey &&
  snapshot.route.indexPolicy === route.indexPolicy &&
  snapshot.currentPath.parentRouteKey === route.parentRouteKey &&
  snapshot.currentPath.segment === route.segment &&
  snapshot.currentPath.matchMode === route.matchMode

const planEntities = async (
  manifest: PopulationManifest,
  registry: UrlRegistry,
  plan: MutablePopulationPlan
) => {
  for (const entity of manifest.entities) {
    const key = populationEntityKey(entity)
    const identity = identityForPopulationEntity(entity)
    const [current, slugResolution] = await Promise.all([
      registry.findEntityRoute({
        market: entity.market,
        sourceId: identity.sourceId,
        sourceSystem: identity.sourceSystem,
        sourceType: identity.sourceType,
      }),
      registry.resolve({
        kind: entity.kind,
        market: entity.market,
        normalizedSlug: entity.publicSlug,
      }),
    ])
    if (
      slugResolution.kind === "unavailable" ||
      slugResolution.kind === "invalid-response"
    ) {
      plan.blockers.push({
        code: "INCOMPLETE_REGISTRY_READ",
        identity: key,
        message: `Slug reservation read returned ${slugResolution.kind}`,
      })
      continue
    }
    if (current.kind === "missing") {
      if (slugResolution.kind === "missing") {
        plan.creates.push({ entity, kind: "create-entity" })
      } else {
        plan.blockers.push({
          code: "EXISTING_ROUTE_CONFLICT",
          identity: key,
          message: "Public slug is reserved by URLR history or another route",
        })
      }
    } else if (
      current.kind === "found" &&
      entityMatches(entity, current.value) &&
      slugResolution.kind === "found" &&
      slugResolution.value.disposition === "current" &&
      slugResolution.value.route.id === current.value.route.id
    ) {
      plan.noops.push(key)
    } else if (current.kind === "found") {
      plan.blockers.push({
        code: "EXISTING_ROUTE_CONFLICT",
        identity: key,
        message:
          "Existing entity route differs; reconcile through its lifecycle owner",
      })
    } else {
      plan.blockers.push({
        code: "INCOMPLETE_REGISTRY_READ",
        identity: key,
        message: `Registry returned ${current.kind}`,
      })
    }
  }
}

const planStatics = async (
  statics: readonly PopulationStaticRoute[],
  registry: UrlRegistry,
  plan: MutablePopulationPlan
) => {
  for (const market of POPULATION_MARKETS) {
    const result = await registry.listStaticRouteSnapshots(market)
    if (result.kind !== "found") {
      plan.blockers.push({
        code: "INCOMPLETE_REGISTRY_READ",
        identity: `${market}:static`,
        message: `Registry returned ${result.kind}`,
      })
      continue
    }
    const existing = new Map(
      result.value.map((snapshot) => [snapshot.route.staticRouteKey, snapshot])
    )
    for (const route of statics.filter(
      (candidate) => candidate.market === market
    )) {
      const snapshot = existing.get(route.routeKey)
      if (!snapshot) {
        plan.creates.push({ kind: "create-static", route })
      } else if (staticMatches(route, snapshot)) {
        plan.noops.push(populationStaticKey(route))
      } else {
        plan.blockers.push({
          code: "EXISTING_ROUTE_CONFLICT",
          identity: populationStaticKey(route),
          message: "Existing static route differs from the approved taxonomy",
        })
      }
    }
  }
}

export const planUrlRegistryPopulation = async (
  manifest: PopulationManifest,
  registry: UrlRegistry
): Promise<PopulationPlan> => {
  const statics = buildPopulationStaticTaxonomy()
  assertPopulationPaths(manifest, statics)
  const mutablePlan: MutablePopulationPlan = {
    blockers: [],
    creates: [],
    noops: [],
  }
  await planEntities(manifest, registry, mutablePlan)
  await planStatics(statics, registry, mutablePlan)

  let activeEntityKeys: readonly string[] = []
  try {
    activeEntityKeys = await readAllActivePopulationEntityKeys(registry)
  } catch (error) {
    mutablePlan.blockers.push({
      code: "INCOMPLETE_REGISTRY_READ",
      identity: "entities",
      message:
        error instanceof Error
          ? error.message
          : "Cannot enumerate entity routes",
    })
  }
  const desiredEntityKeys = new Set(manifest.entities.map(populationEntityKey))
  const desiredStaticKeys = new Set(statics.map(populationStaticKey))
  const retirementPlan = [
    ...activeEntityKeys.filter((key) => !desiredEntityKeys.has(key)),
    ...(await readActivePopulationStaticKeys(registry)).filter(
      (key) => !desiredStaticKeys.has(key)
    ),
  ].sort()
  mutablePlan.blockers.push(
    ...retirementPlan.map((identity) => ({
      code: "UNMANAGED_ACTIVE_ROUTE" as const,
      identity,
      message:
        "Retirement requires an explicit lifecycle-owner command; population never deletes",
    }))
  )

  return {
    blockers: mutablePlan.blockers,
    creates: mutablePlan.creates,
    manifestHash: hashPopulationManifest(manifest),
    noops: mutablePlan.noops,
    retirementPlan,
    totals: {
      desiredEntities: manifest.entities.length,
      desiredStatics: statics.length,
    },
  }
}
