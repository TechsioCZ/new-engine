import type { Market } from "@/lib/url/types"
import type {
  ChangeSlugRequest,
  ChangeStaticPathRequest,
  CreateEntityRouteRequest,
  CreateStaticRouteRequest,
  EntityRouteMutationResult,
  GoneMutationResult,
  RegisterGoneRequest,
  RetireRouteRequest,
  StaticRouteMutationResult,
  SupersedeEntityRouteRequest,
  SupersedeStaticRouteRequest,
  UpdateRouteRequest,
  UrlRegistryAuditRecord,
  UrlRegistryCommand,
  UrlRegistryInvalidationOutboxRecord,
} from "./commands"
import type {
  ActiveEntityRouteTarget,
  ActiveRouteTarget,
  EntityRouteIdentity,
  EntityRouteSnapshot,
  StaticRouteIdentity,
  StaticRouteSnapshot,
  UrlRouteSnapshot,
} from "./model"
import type {
  ActiveEquivalenceLookup,
  ActiveEntityRoutePageRequest,
  EntityIdentityLookup,
  SourceReadResult,
  UrlRegistryBatchResolution,
  UrlRegistryPage,
  UrlRegistryPageRequest,
  UrlRegistryResolution,
  UrlRegistryResolveInput,
  UrlRegistryResolveManyInput,
} from "./reads"

// biome-ignore lint/performance/noBarrelFile: Intentional public adapter contract.
export * from "./command-fingerprint"
export type * from "./commands"
export * from "./model"
export * from "./pagination"
export type * from "./reads"

// biome-ignore lint/style/useConsistentTypeDefinitions: Public adapter port.
export interface UrlRegistry {
  createEntityRoute(
    command: UrlRegistryCommand<CreateEntityRouteRequest>
  ): Promise<EntityRouteMutationResult>
  createStaticRoute(
    command: UrlRegistryCommand<CreateStaticRouteRequest>
  ): Promise<StaticRouteMutationResult>
  changeSlug(
    command: UrlRegistryCommand<ChangeSlugRequest>
  ): Promise<EntityRouteMutationResult>
  changeStaticPath(
    command: UrlRegistryCommand<ChangeStaticPathRequest>
  ): Promise<StaticRouteMutationResult>
  updateRoute(
    command: UrlRegistryCommand<UpdateRouteRequest<EntityRouteIdentity>>
  ): Promise<EntityRouteMutationResult>
  updateRoute(
    command: UrlRegistryCommand<UpdateRouteRequest<StaticRouteIdentity>>
  ): Promise<StaticRouteMutationResult>
  retireRoute(
    command: UrlRegistryCommand<RetireRouteRequest<EntityRouteIdentity>>
  ): Promise<EntityRouteMutationResult>
  retireRoute(
    command: UrlRegistryCommand<RetireRouteRequest<StaticRouteIdentity>>
  ): Promise<StaticRouteMutationResult>
  supersedeRoute(
    command: UrlRegistryCommand<SupersedeEntityRouteRequest>
  ): Promise<EntityRouteMutationResult>
  supersedeRoute(
    command: UrlRegistryCommand<SupersedeStaticRouteRequest>
  ): Promise<StaticRouteMutationResult>
  registerGone(
    command: UrlRegistryCommand<RegisterGoneRequest>
  ): Promise<GoneMutationResult>
  resolve(
    input: UrlRegistryResolveInput
  ): Promise<SourceReadResult<UrlRegistryResolution>>
  resolveMany(
    input: UrlRegistryResolveManyInput
  ): Promise<SourceReadResult<readonly UrlRegistryBatchResolution[]>>
  findActiveEntityRoute(
    input: EntityIdentityLookup
  ): Promise<SourceReadResult<ActiveEntityRouteTarget>>
  listActiveEntityRoutes(
    input: ActiveEntityRoutePageRequest
  ): Promise<SourceReadResult<UrlRegistryPage<ActiveEntityRouteTarget>>>
  findEntityRoute(
    input: EntityIdentityLookup
  ): Promise<SourceReadResult<EntityRouteSnapshot>>
  findActiveEquivalents(
    input: ActiveEquivalenceLookup
  ): Promise<SourceReadResult<readonly ActiveRouteTarget[]>>
  listStaticRouteSnapshots(
    market: Market
  ): Promise<SourceReadResult<readonly StaticRouteSnapshot[]>>
  getRoute(routeId: string): Promise<SourceReadResult<UrlRouteSnapshot>>
  listAuditRecords(
    input: UrlRegistryPageRequest
  ): Promise<SourceReadResult<UrlRegistryPage<UrlRegistryAuditRecord>>>
  listPendingInvalidations(
    input: UrlRegistryPageRequest
  ): Promise<
    SourceReadResult<UrlRegistryPage<UrlRegistryInvalidationOutboxRecord>>
  >
}
