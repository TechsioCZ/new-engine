import type { Market } from "@/lib/url/types"
import type {
  ActiveEntityRouteCountRequest,
  ActiveEntityRoutePageRequest,
  ActiveEquivalenceLookup,
  ActiveRouteTarget,
  EntityIdentityLookup,
  EntityRouteSnapshot,
  SourceReadResult,
  StaticRouteResolution,
  StaticRouteResolveInput,
  StaticRouteSnapshot,
  UrlRegistryAuditRecord,
  UrlRegistryBatchResolution,
  UrlRegistryInvalidationOutboxRecord,
  UrlRegistryPage,
  UrlRegistryPageRequest,
  UrlRegistryResolution,
  UrlRegistryResolveInput,
  UrlRegistryResolveManyInput,
  UrlRouteSnapshot,
} from "../contracts"
import { resolveStaticRouteSnapshots } from "../static-path-resolution"
import { listAudits, listPendingOutbox } from "./audit-read"
import {
  countActiveEntities,
  findActiveEntity,
  findEntity,
  findEquivalents,
  getRouteSnapshot,
  listActiveEntities,
  listStaticSnapshots,
} from "./projection-read"
import { resolveBatch, resolveOne } from "./resolution-read"
import type { SqlPool } from "./sql"

export class PostgresRegistryReads {
  private readonly primary: SqlPool

  constructor(primary: SqlPool) {
    this.primary = primary
  }

  resolve(
    input: UrlRegistryResolveInput
  ): Promise<SourceReadResult<UrlRegistryResolution>> {
    return resolveOne(this.primary, input)
  }

  resolveMany(
    input: UrlRegistryResolveManyInput
  ): Promise<SourceReadResult<readonly UrlRegistryBatchResolution[]>> {
    return resolveBatch(this.primary, input)
  }

  async resolveStaticPath(
    input: StaticRouteResolveInput
  ): Promise<SourceReadResult<StaticRouteResolution>> {
    const snapshots = await listStaticSnapshots(this.primary, input.market)
    return snapshots.kind === "found"
      ? resolveStaticRouteSnapshots(snapshots.value, input)
      : snapshots
  }

  findActiveEntityRoute(
    input: EntityIdentityLookup
  ): Promise<
    SourceReadResult<Extract<ActiveRouteTarget, { projectionType: "entity" }>>
  > {
    return findActiveEntity(this.primary, input)
  }

  listActiveEntityRoutes(
    input: ActiveEntityRoutePageRequest
  ): Promise<
    SourceReadResult<
      UrlRegistryPage<Extract<ActiveRouteTarget, { projectionType: "entity" }>>
    >
  > {
    return listActiveEntities(this.primary, input)
  }

  countActiveEntityRoutes(
    input: ActiveEntityRouteCountRequest
  ): Promise<SourceReadResult<number>> {
    return countActiveEntities(this.primary, input)
  }

  findEntityRoute(
    input: EntityIdentityLookup
  ): Promise<SourceReadResult<EntityRouteSnapshot>> {
    return findEntity(this.primary, input)
  }

  findActiveEquivalents(
    input: ActiveEquivalenceLookup
  ): Promise<SourceReadResult<readonly ActiveRouteTarget[]>> {
    return findEquivalents(this.primary, input)
  }

  listStaticRouteSnapshots(
    market: Market
  ): Promise<SourceReadResult<readonly StaticRouteSnapshot[]>> {
    return listStaticSnapshots(this.primary, market)
  }

  getRoute(routeId: string): Promise<SourceReadResult<UrlRouteSnapshot>> {
    return getRouteSnapshot(this.primary, routeId)
  }

  listAuditRecords(
    input: UrlRegistryPageRequest
  ): Promise<SourceReadResult<UrlRegistryPage<UrlRegistryAuditRecord>>> {
    return listAudits(this.primary, input)
  }

  listPendingInvalidations(
    input: UrlRegistryPageRequest
  ): Promise<
    SourceReadResult<UrlRegistryPage<UrlRegistryInvalidationOutboxRecord>>
  > {
    return listPendingOutbox(this.primary, input)
  }
}
