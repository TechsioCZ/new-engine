import type { Market } from "@/lib/url/types"
import type {
  EntityRouteMutationResult,
  GoneMutationResult,
  StaticRouteMutationResult,
  UrlRegistryAuditRecord,
  UrlRegistryCommandRequest,
  UrlRegistryInvalidationOutboxRecord,
} from "./commands"
import type {
  EntityRouteIdentity,
  StaticRouteIdentity,
  StaticRoutePath,
  UrlEntitySlug,
  UrlRoute,
} from "./model"

export type StoredCommandResult =
  | EntityRouteMutationResult
  | StaticRouteMutationResult
  | GoneMutationResult

export type StoredCommand = Readonly<{
  commandType: UrlRegistryCommandRequest["commandType"]
  requestFingerprint: string
  result: StoredCommandResult
}>

export type MemoryRegistryState = {
  routes: Map<string, UrlRoute>
  slugs: Map<string, UrlEntitySlug>
  staticPaths: Map<string, StaticRoutePath>
  commands: Map<string, StoredCommand>
  sourceEvents: Map<string, string>
  audits: UrlRegistryAuditRecord[]
  invalidations: UrlRegistryInvalidationOutboxRecord[]
}

export const emptyMemoryState = (): MemoryRegistryState => ({
  routes: new Map(),
  slugs: new Map(),
  staticPaths: new Map(),
  commands: new Map(),
  sourceEvents: new Map(),
  audits: [],
  invalidations: [],
})

export const cloneValue = <Value>(value: Value): Value => structuredClone(value)

export const cloneMemoryState = (
  state: MemoryRegistryState
): MemoryRegistryState => ({
  routes: new Map(
    [...state.routes].map(([id, route]) => [id, cloneValue(route)])
  ),
  slugs: new Map([...state.slugs].map(([id, slug]) => [id, cloneValue(slug)])),
  staticPaths: new Map(
    [...state.staticPaths].map(([id, path]) => [id, cloneValue(path)])
  ),
  commands: new Map(
    [...state.commands].map(([key, command]) => [key, cloneValue(command)])
  ),
  sourceEvents: new Map(state.sourceEvents),
  audits: cloneValue(state.audits),
  invalidations: cloneValue(state.invalidations),
})

export const entityIdentityKey = (
  market: Market,
  identity: EntityRouteIdentity
) =>
  JSON.stringify([
    market,
    identity.sourceSystem,
    identity.sourceType,
    identity.sourceId,
  ])

export const staticIdentityKey = (
  market: Market,
  identity: StaticRouteIdentity
) => JSON.stringify([market, identity.staticRouteKey])

export const slugKey = (
  slug: Pick<UrlEntitySlug, "market" | "kind" | "normalizedSlug">
) => JSON.stringify([slug.market, slug.kind, slug.normalizedSlug])

export const staticPathKey = (
  path: Pick<StaticRoutePath, "market" | "parentRouteKey" | "segment">
) => JSON.stringify([path.market, path.parentRouteKey, path.segment])

export const sourceEventKey = (sourceSystem: string, sourceEventId: string) =>
  JSON.stringify([sourceSystem, sourceEventId])
