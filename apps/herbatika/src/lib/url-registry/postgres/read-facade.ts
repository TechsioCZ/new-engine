import type { Market } from "@/lib/url/types"
import type {
  ActiveEquivalenceLookup,
  ActiveRouteTarget,
  EntityIdentityLookup,
  EntityRouteSnapshot,
  SourceReadResult,
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
import { listAudits, listPendingOutbox } from "./audit-read"
import {
  findActiveEntity,
  findEntity,
  findEquivalents,
  getRouteSnapshot,
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

  findActiveEntityRoute(
    input: EntityIdentityLookup
  ): Promise<
    SourceReadResult<Extract<ActiveRouteTarget, { projectionType: "entity" }>>
  > {
    return findActiveEntity(this.primary, input)
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
