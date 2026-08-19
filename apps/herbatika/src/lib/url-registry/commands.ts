import type { Market } from "@/lib/url/types"
import type {
  EntityRouteIdentity,
  EntityRouteSnapshot,
  EntityUrlKind,
  StaticPathMatchMode,
  StaticRouteIdentity,
  StaticRouteSnapshot,
  UrlEntitySlug,
  UrlIndexPolicy,
  UrlRouteIdentity,
} from "./model"

export type UrlRegistryCommandSource = Readonly<{
  producer: string
  sourceSystem: string
  sourceType: string
  sourceId: string
  /** Opaque audit value. Optimistic route version is the ordering authority. */
  sourceVersion: string
  /** One URLR command; fan-out must derive child IDs such as `${eventId}:sk`. */
  sourceEventId: string
}>

type CommandRequestBase = Readonly<{
  expectedVersion: number
  source: UrlRegistryCommandSource
}>

type RouteCreateBase = Readonly<{
  market: Market
  equivalenceKey: string | null
  indexPolicy: UrlIndexPolicy
}>

export type CreateEntityRouteRequest = CommandRequestBase &
  Readonly<{
    commandType: "create-entity-route"
    expectedVersion: 0
    route: RouteCreateBase &
      Readonly<{ kind: EntityUrlKind; identity: EntityRouteIdentity }>
    slug: Readonly<{ normalizedSlug: string; normalizationVersion: number }>
  }>

export type CreateStaticRouteRequest = CommandRequestBase &
  Readonly<{
    commandType: "create-static-route"
    expectedVersion: 0
    route: RouteCreateBase &
      Readonly<{ kind: "static"; identity: StaticRouteIdentity }>
    path: Readonly<{
      parentRouteKey: string | null
      segment: string
      matchMode: StaticPathMatchMode
    }>
  }>

export type ChangeSlugRequest = CommandRequestBase &
  Readonly<{
    commandType: "change-slug"
    target: Readonly<{ routeId: string; identity: EntityRouteIdentity }>
    slug: Readonly<{ normalizedSlug: string; normalizationVersion: number }>
  }>

export type ChangeStaticPathRequest = CommandRequestBase &
  Readonly<{
    commandType: "change-static-path"
    target: Readonly<{ routeId: string; identity: StaticRouteIdentity }>
    path: Readonly<{
      parentRouteKey: string | null
      segment: string
      matchMode: StaticPathMatchMode
    }>
  }>

export type UpdateRouteRequest<
  Identity extends UrlRouteIdentity = UrlRouteIdentity,
> = CommandRequestBase &
  Readonly<{
    commandType: "update-route"
    target: Readonly<{ routeId: string; identity: Identity }>
    metadata: Readonly<{
      equivalenceKey: string | null
      indexPolicy: UrlIndexPolicy
    }>
  }>

export type RetireRouteRequest<
  Identity extends UrlRouteIdentity = UrlRouteIdentity,
> = CommandRequestBase &
  Readonly<{
    commandType: "retire-route"
    target: Readonly<{ routeId: string; identity: Identity }>
  }>

type SupersedeBase<Identity extends UrlRouteIdentity> = CommandRequestBase &
  Readonly<{
    commandType: "supersede-route"
    target: Readonly<{ routeId: string; identity: Identity }>
    successor: Readonly<{ routeId: string; identity: Identity }>
  }>

export type SupersedeEntityRouteRequest = SupersedeBase<EntityRouteIdentity>
export type SupersedeStaticRouteRequest = SupersedeBase<StaticRouteIdentity>
export type SupersedeRouteRequest =
  | SupersedeEntityRouteRequest
  | SupersedeStaticRouteRequest

export type RegisterGoneRequest = CommandRequestBase &
  Readonly<{
    commandType: "register-gone"
    expectedVersion: 0
    slug: Readonly<{
      market: Market
      kind: EntityUrlKind
      normalizedSlug: string
      normalizationVersion: number
    }>
  }>

export type UrlRegistryCommandRequest =
  | CreateEntityRouteRequest
  | CreateStaticRouteRequest
  | ChangeSlugRequest
  | ChangeStaticPathRequest
  | UpdateRouteRequest
  | RetireRouteRequest
  | SupersedeRouteRequest
  | RegisterGoneRequest

export type UrlRegistryCommand<
  Request extends UrlRegistryCommandRequest = UrlRegistryCommandRequest,
> = Readonly<{
  commandVersion: 1
  idempotencyKey: string
  requestFingerprint: string
  request: Request
}>

export type UrlRegistryAuditRecord = Readonly<{
  id: string
  commandVersion: 1
  idempotencyKey: string
  requestFingerprint: string
  action: UrlRegistryCommandRequest["commandType"]
  outcome: "applied" | "noop"
  routeId: string | null
  affectedRouteIds: readonly string[]
  source: UrlRegistryCommandSource
  previousVersion: number | null
  resultVersion: number | null
  details: Readonly<Record<string, unknown>>
  createdAt: string
}>

export type UrlRegistryInvalidationOutboxRecord = Readonly<{
  id: string
  auditId: string
  idempotencyKey: string
  status: "pending"
  tags: readonly string[]
  createdAt: string
}>

export type UrlRegistryCommandCommit = Readonly<{
  outcome: "applied" | "noop"
  replayed: boolean
  audit: UrlRegistryAuditRecord
  invalidation: UrlRegistryInvalidationOutboxRecord | null
}>

type MutationResult<Snapshot> = Readonly<{
  snapshot: Snapshot
  affectedRouteIds: readonly string[]
  commit: UrlRegistryCommandCommit
}>

export type EntityRouteMutationResult = MutationResult<EntityRouteSnapshot>
export type StaticRouteMutationResult = MutationResult<StaticRouteSnapshot>
export type RouteMutationResult =
  | EntityRouteMutationResult
  | StaticRouteMutationResult
export type GoneMutationResult = Readonly<{
  slug: UrlEntitySlug
  commit: UrlRegistryCommandCommit
}>
