import type {
  CreateEntityRouteRequest,
  CreateStaticRouteRequest,
  EntityRouteIdentity,
  EntityRouteMutationResult,
  SourceReadResult,
  StaticRouteIdentity,
  StaticRouteMutationResult,
  UrlRegistry,
  UrlRegistryCommand,
  UrlRegistryCommandRequest,
} from "./contracts"
import { createUrlRegistryCommand } from "./contracts"

export type RegistryBehaviorHarness = {
  namespace: string
  registry: UrlRegistry
  cleanup(): Promise<void>
}

export type HarnessFactory = () => Promise<RegistryBehaviorHarness>
export type Suite = (name: string, factory: () => void) => unknown
export type BehaviorMarket = "sk" | "cz" | "hu" | "ro"

export const foundValue = <Value>(result: SourceReadResult<Value>): Value => {
  if (result.kind !== "found") {
    throw new Error(`Expected found result, received ${result.kind}`)
  }
  return result.value
}

export const entityIdentity = (id: string): EntityRouteIdentity => ({
  targetType: "entity",
  sourceSystem: "medusa",
  sourceType: "product",
  sourceId: id,
  staticRouteKey: null,
})

export const staticIdentity = (routeKey: string): StaticRouteIdentity => ({
  targetType: "static",
  sourceSystem: null,
  sourceType: null,
  sourceId: null,
  staticRouteKey: routeKey,
})

export const entitySource = (
  identity: EntityRouteIdentity,
  eventId: string,
  version = "1"
) => ({
  producer: "behavior-suite",
  sourceSystem: identity.sourceSystem,
  sourceType: identity.sourceType,
  sourceId: identity.sourceId,
  sourceVersion: version,
  sourceEventId: eventId,
})

export const staticSource = (
  identity: StaticRouteIdentity,
  eventId: string,
  version = "1"
) => ({
  producer: "behavior-suite",
  sourceSystem: "next",
  sourceType: "static-route",
  sourceId: identity.staticRouteKey,
  sourceVersion: version,
  sourceEventId: eventId,
})

export const command = <Request extends UrlRegistryCommandRequest>(
  idempotencyKey: string,
  request: Request
): UrlRegistryCommand<Request> =>
  createUrlRegistryCommand({ idempotencyKey, request })

export const createEntityRequest = ({
  identity,
  eventId,
  slug,
  equivalenceKey,
  market = "sk",
}: {
  identity: EntityRouteIdentity
  eventId: string
  slug: string
  equivalenceKey: string | null
  market?: BehaviorMarket
}): CreateEntityRouteRequest => ({
  commandType: "create-entity-route",
  expectedVersion: 0,
  source: entitySource(identity, eventId),
  route: {
    market,
    kind: "product",
    identity,
    equivalenceKey,
    indexPolicy: "indexable",
  },
  slug: { normalizedSlug: slug, normalizationVersion: 1 },
})

export const createEntity = async (
  harness: RegistryBehaviorHarness,
  token: string,
  options: Readonly<{
    slug?: string
    equivalenceKey?: string | null
    market?: BehaviorMarket
  }> = {}
): Promise<{
  identity: EntityRouteIdentity
  result: EntityRouteMutationResult
}> => {
  const key = `${harness.namespace}:${token}`
  const identity = entityIdentity(`${harness.namespace}-${token}`)
  const request = createEntityRequest({
    identity,
    eventId: key,
    slug: options.slug ?? `${harness.namespace}-${token}`,
    equivalenceKey: options.equivalenceKey ?? `${harness.namespace}:${token}`,
    market: options.market,
  })
  return {
    identity,
    result: await harness.registry.createEntityRoute(command(key, request)),
  }
}

export const createStaticRequest = ({
  identity,
  eventId,
  market = "sk",
  parentRouteKey = null,
  segment,
}: {
  identity: StaticRouteIdentity
  eventId: string
  market?: BehaviorMarket
  parentRouteKey?: string | null
  segment: string
}): CreateStaticRouteRequest => ({
  commandType: "create-static-route",
  expectedVersion: 0,
  source: staticSource(identity, eventId),
  route: {
    market,
    kind: "static",
    identity,
    equivalenceKey: null,
    indexPolicy: "indexable",
  },
  path: { parentRouteKey, segment, matchMode: "exact" },
})

export const createStatic = async (
  harness: RegistryBehaviorHarness,
  token: string,
  parentRouteKey: string | null = null
): Promise<{
  identity: StaticRouteIdentity
  result: StaticRouteMutationResult
}> => {
  const routeKey = `${harness.namespace}-${token}`
  const identity = staticIdentity(routeKey)
  const eventId = `${harness.namespace}:${token}`
  const request = createStaticRequest({
    identity,
    eventId,
    parentRouteKey,
    segment: token,
  })
  return {
    identity,
    result: await harness.registry.createStaticRoute(command(eventId, request)),
  }
}
