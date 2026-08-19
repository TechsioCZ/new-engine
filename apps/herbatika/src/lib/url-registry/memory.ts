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
  RouteMutationResult,
  StaticRouteMutationResult,
  SupersedeEntityRouteRequest,
  SupersedeRouteRequest,
  SupersedeStaticRouteRequest,
  UpdateRouteRequest,
  UrlRegistryAuditRecord,
  UrlRegistryCommand,
  UrlRegistryInvalidationOutboxRecord,
} from "./commands"
import type { UrlRegistry } from "./contracts"
import {
  listAuditRecords,
  listPendingInvalidations,
} from "./memory-admin-reads"
import { MemoryCommandExecutor } from "./memory-command"
import { changeEntitySlug, createEntityRoute } from "./memory-entity"
import { registerGone } from "./memory-gone"
import { updateRouteMetadata } from "./memory-metadata"
import {
  findActiveEntityRoute,
  findActiveEquivalents,
  findEntityRoute,
  getRoute,
  listActiveEntityRoutes,
  listStaticRouteSnapshots,
} from "./memory-reads"
import { resolve, resolveMany } from "./memory-resolve"
import { retireRoute } from "./memory-retire"
import { changeStaticPath, createStaticRoute } from "./memory-static"
import { supersedeRoute } from "./memory-supersede"
import type { InMemoryUrlRegistryOptions } from "./memory-support"
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
  ActiveEntityRoutePageRequest,
  ActiveEquivalenceLookup,
  EntityIdentityLookup,
  SourceReadResult,
  UrlRegistryBatchResolution,
  UrlRegistryPage,
  UrlRegistryPageRequest,
  UrlRegistryResolution,
  UrlRegistryResolveInput,
  UrlRegistryResolveManyInput,
} from "./reads"

export type { InMemoryUrlRegistryOptions, MemoryIdKind } from "./memory-support"

export class InMemoryUrlRegistry implements UrlRegistry {
  private readonly executor: MemoryCommandExecutor

  constructor(options: InMemoryUrlRegistryOptions = {}) {
    this.executor = new MemoryCommandExecutor(options)
  }

  async createEntityRoute(
    command: UrlRegistryCommand<CreateEntityRouteRequest>
  ): Promise<EntityRouteMutationResult> {
    await Promise.resolve()
    return createEntityRoute(this.executor, command)
  }

  async createStaticRoute(
    command: UrlRegistryCommand<CreateStaticRouteRequest>
  ): Promise<StaticRouteMutationResult> {
    await Promise.resolve()
    return createStaticRoute(this.executor, command)
  }

  async changeSlug(
    command: UrlRegistryCommand<ChangeSlugRequest>
  ): Promise<EntityRouteMutationResult> {
    await Promise.resolve()
    return changeEntitySlug(this.executor, command)
  }

  async changeStaticPath(
    command: UrlRegistryCommand<ChangeStaticPathRequest>
  ): Promise<StaticRouteMutationResult> {
    await Promise.resolve()
    return changeStaticPath(this.executor, command)
  }

  updateRoute(
    command: UrlRegistryCommand<UpdateRouteRequest<EntityRouteIdentity>>
  ): Promise<EntityRouteMutationResult>
  updateRoute(
    command: UrlRegistryCommand<UpdateRouteRequest<StaticRouteIdentity>>
  ): Promise<StaticRouteMutationResult>
  async updateRoute(
    command: UrlRegistryCommand<UpdateRouteRequest>
  ): Promise<RouteMutationResult> {
    await Promise.resolve()
    return updateRouteMetadata(this.executor, command)
  }

  retireRoute(
    command: UrlRegistryCommand<RetireRouteRequest<EntityRouteIdentity>>
  ): Promise<EntityRouteMutationResult>
  retireRoute(
    command: UrlRegistryCommand<RetireRouteRequest<StaticRouteIdentity>>
  ): Promise<StaticRouteMutationResult>
  async retireRoute(
    command: UrlRegistryCommand<RetireRouteRequest>
  ): Promise<RouteMutationResult> {
    await Promise.resolve()
    return retireRoute(this.executor, command)
  }

  supersedeRoute(
    command: UrlRegistryCommand<SupersedeEntityRouteRequest>
  ): Promise<EntityRouteMutationResult>
  supersedeRoute(
    command: UrlRegistryCommand<SupersedeStaticRouteRequest>
  ): Promise<StaticRouteMutationResult>
  async supersedeRoute(
    command: UrlRegistryCommand<SupersedeRouteRequest>
  ): Promise<RouteMutationResult> {
    await Promise.resolve()
    return supersedeRoute(this.executor, command)
  }

  async registerGone(
    command: UrlRegistryCommand<RegisterGoneRequest>
  ): Promise<GoneMutationResult> {
    await Promise.resolve()
    return registerGone(this.executor, command)
  }

  async resolve(
    input: UrlRegistryResolveInput
  ): Promise<SourceReadResult<UrlRegistryResolution>> {
    await Promise.resolve()
    return resolve(this.executor.readState(), input)
  }

  async resolveMany(
    input: UrlRegistryResolveManyInput
  ): Promise<SourceReadResult<readonly UrlRegistryBatchResolution[]>> {
    await Promise.resolve()
    return resolveMany(this.executor.readState(), input)
  }

  async findActiveEntityRoute(
    input: EntityIdentityLookup
  ): Promise<SourceReadResult<ActiveEntityRouteTarget>> {
    await Promise.resolve()
    return findActiveEntityRoute(this.executor.readState(), input)
  }

  async listActiveEntityRoutes(
    input: ActiveEntityRoutePageRequest
  ): Promise<SourceReadResult<UrlRegistryPage<ActiveEntityRouteTarget>>> {
    await Promise.resolve()
    return listActiveEntityRoutes(this.executor.readState(), input)
  }

  async findEntityRoute(
    input: EntityIdentityLookup
  ): Promise<SourceReadResult<EntityRouteSnapshot>> {
    await Promise.resolve()
    return findEntityRoute(this.executor.readState(), input)
  }

  async findActiveEquivalents(
    input: ActiveEquivalenceLookup
  ): Promise<SourceReadResult<readonly ActiveRouteTarget[]>> {
    await Promise.resolve()
    return findActiveEquivalents(this.executor.readState(), input)
  }

  async listStaticRouteSnapshots(
    market: Market
  ): Promise<SourceReadResult<readonly StaticRouteSnapshot[]>> {
    await Promise.resolve()
    return listStaticRouteSnapshots(this.executor.readState(), market)
  }

  async getRoute(routeId: string): Promise<SourceReadResult<UrlRouteSnapshot>> {
    await Promise.resolve()
    return getRoute(this.executor.readState(), routeId)
  }

  async listAuditRecords(
    input: UrlRegistryPageRequest
  ): Promise<SourceReadResult<UrlRegistryPage<UrlRegistryAuditRecord>>> {
    await Promise.resolve()
    return listAuditRecords(this.executor.readState(), input)
  }

  async listPendingInvalidations(
    input: UrlRegistryPageRequest
  ): Promise<
    SourceReadResult<UrlRegistryPage<UrlRegistryInvalidationOutboxRecord>>
  > {
    await Promise.resolve()
    return listPendingInvalidations(this.executor.readState(), input)
  }
}
