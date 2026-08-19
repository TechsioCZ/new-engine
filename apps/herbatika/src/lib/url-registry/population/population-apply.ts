import {
  createUrlRegistryCommand,
  type RouteMutationResult,
  type UrlRegistry,
} from "../contracts"
import type { PopulationEntity, PopulationManifest } from "./manifest-contracts"
import {
  type CreateEntityAction,
  type CreateStaticAction,
  identityForPopulationEntity,
  type PopulationBlocker,
  planUrlRegistryPopulation,
  populationEntityKey,
  populationStaticKey,
} from "./population-plan"
import type { PopulationStaticRoute } from "./static-taxonomy"

export type PopulationApplyReport = Readonly<{
  applied: number
  auditIds: readonly string[]
  manifestHash: `sha256:${string}`
  noops: number
  replayed: number
  retirementPlan: readonly string[]
  rollbackPlan: readonly Readonly<{
    expectedVersion: number
    identity: string
    owner: "deployment" | "medusa" | "payload"
    routeId: string
  }>[]
}>

export class PopulationApplyError extends Error {
  override readonly name = "PopulationApplyError"
  readonly blockers: readonly PopulationBlocker[]

  constructor(blockers: readonly PopulationBlocker[]) {
    super(`URLR population is blocked by ${blockers.length} conflict(s)`)
    this.blockers = blockers
  }
}

const createEntity = (registry: UrlRegistry, entity: PopulationEntity) => {
  const identity = identityForPopulationEntity(entity)
  return registry.createEntityRoute(
    createUrlRegistryCommand({
      idempotencyKey: `population:v1:${populationEntityKey(entity)}:${entity.sourceVersion}`,
      request: {
        commandType: "create-entity-route",
        expectedVersion: 0,
        route: {
          equivalenceKey: entity.equivalenceKey,
          identity,
          indexPolicy: entity.indexPolicy,
          kind: entity.kind,
          market: entity.market,
        },
        slug: { normalizationVersion: 1, normalizedSlug: entity.publicSlug },
        source: {
          producer: "urlr-initial-population-v1",
          sourceEventId: entity.sourceEventId,
          sourceId: entity.sourceId,
          sourceSystem: identity.sourceSystem,
          sourceType: identity.sourceType,
          sourceVersion: entity.sourceVersion,
        },
      },
    })
  )
}

const createStatic = (
  registry: UrlRegistry,
  manifest: PopulationManifest,
  route: PopulationStaticRoute
) =>
  registry.createStaticRoute(
    createUrlRegistryCommand({
      idempotencyKey: `population:v1:${populationStaticKey(route)}:${manifest.taxonomyApproval.hash}`,
      request: {
        commandType: "create-static-route",
        expectedVersion: 0,
        path: {
          matchMode: route.matchMode,
          parentRouteKey: route.parentRouteKey,
          segment: route.segment,
        },
        route: {
          equivalenceKey: route.equivalenceKey,
          identity: {
            sourceId: null,
            sourceSystem: null,
            sourceType: null,
            staticRouteKey: route.routeKey,
            targetType: "static",
          },
          indexPolicy: route.indexPolicy,
          kind: "static",
          market: route.market,
        },
        source: {
          producer: "urlr-initial-population-v1",
          sourceEventId: `taxonomy:${manifest.taxonomyApproval.hash}:${route.market}:${route.routeKey}`,
          sourceId: route.routeKey,
          sourceSystem: "deployment",
          sourceType: "route-taxonomy",
          sourceVersion: manifest.taxonomyApproval.hash,
        },
      },
    })
  )

const executeCreates = async (
  manifest: PopulationManifest,
  registry: UrlRegistry,
  creates: readonly (CreateEntityAction | CreateStaticAction)[],
  batchSize: number
): Promise<readonly RouteMutationResult[]> => {
  const results: RouteMutationResult[] = []
  const statics = creates.filter(
    (action): action is CreateStaticAction => action.kind === "create-static"
  )
  for (const action of statics) {
    results.push(await createStatic(registry, manifest, action.route))
  }
  const entities = creates.filter(
    (action): action is CreateEntityAction => action.kind === "create-entity"
  )
  for (let offset = 0; offset < entities.length; offset += batchSize) {
    results.push(
      ...(await Promise.all(
        entities
          .slice(offset, offset + batchSize)
          .map(({ entity }) => createEntity(registry, entity))
      ))
    )
  }
  return results
}

const rollbackOwner = (
  snapshot: RouteMutationResult["snapshot"]
): "deployment" | "medusa" | "payload" => {
  if (snapshot.route.targetType === "static") {
    return "deployment"
  }
  return snapshot.route.sourceSystem === "payload" ? "payload" : "medusa"
}

const rollbackEntry = ({ snapshot }: RouteMutationResult) => ({
  expectedVersion: snapshot.route.version,
  identity:
    snapshot.route.targetType === "static"
      ? `${snapshot.route.market}:static:${snapshot.route.staticRouteKey}`
      : `${snapshot.route.market}:${snapshot.route.kind}:${snapshot.route.sourceId}`,
  owner: rollbackOwner(snapshot),
  routeId: snapshot.route.id,
})

export const applyUrlRegistryPopulation = async (
  manifest: PopulationManifest,
  registry: UrlRegistry,
  options: Readonly<{ batchSize: number }>
): Promise<PopulationApplyReport> => {
  if (
    !Number.isSafeInteger(options.batchSize) ||
    options.batchSize < 1 ||
    options.batchSize > 100
  ) {
    throw new Error("Population batchSize must be an integer between 1 and 100")
  }
  const plan = await planUrlRegistryPopulation(manifest, registry)
  if (plan.blockers.length > 0) {
    throw new PopulationApplyError(plan.blockers)
  }
  const results = await executeCreates(
    manifest,
    registry,
    plan.creates,
    options.batchSize
  )
  return {
    applied: results.filter(({ commit }) => commit.outcome === "applied")
      .length,
    auditIds: results.map(({ commit }) => commit.audit.id),
    manifestHash: plan.manifestHash,
    noops: plan.noops.length,
    replayed: results.filter(({ commit }) => commit.replayed).length,
    retirementPlan: plan.retirementPlan,
    rollbackPlan: results.map(rollbackEntry),
  }
}
