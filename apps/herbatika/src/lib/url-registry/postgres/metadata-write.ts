import type {
  UpdateRouteRequest,
  UrlRegistryCommand,
  UrlRouteIdentity,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import { type RouteCommandDraft, tagsForSnapshots } from "./command-finalizer"
import {
  assertMetadata,
  assertMutableRoute,
  assertUuid,
} from "./input-validation"
import { loadRoute, loadSnapshot } from "./snapshot-store"
import type { SqlExecutor } from "./sql"
import { lockTargetRoute } from "./write-context"

export const updateRouteMetadata = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand<UpdateRouteRequest<UrlRouteIdentity>>
): Promise<RouteCommandDraft> => {
  const { request } = command
  assertUuid(request.target.routeId, "target.routeId")
  assertMetadata(request.metadata)
  const route = await lockTargetRoute(
    executor,
    request.target,
    request.source,
    request.expectedVersion
  )
  assertMutableRoute(route, request.expectedVersion)
  const before = await loadSnapshot(executor, route)
  if (
    route.equivalenceKey === request.metadata.equivalenceKey &&
    route.indexPolicy === request.metadata.indexPolicy
  ) {
    return {
      kind: "route",
      snapshot: before,
      outcome: "noop",
      routeId: route.id,
      affectedRouteIds: [route.id],
      previousVersion: route.version,
      resultVersion: route.version,
      details: { reason: "same-route-metadata" },
      beforeState: before,
      tags: null,
    }
  }
  await executor.query(
    `UPDATE url_registry.url_route
        SET equivalence_key = $2, index_policy = $3, version = version + 1
      WHERE id = $1`,
    [route.id, request.metadata.equivalenceKey, request.metadata.indexPolicy]
  )
  const updated = await loadRoute(executor, route.id)
  if (!updated) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Updated route disappeared"
    )
  }
  const snapshot = await loadSnapshot(executor, updated)
  const extra = route.equivalenceKey
    ? [`equivalence:${route.equivalenceKey}`]
    : []
  return {
    kind: "route",
    snapshot,
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds: [route.id],
    previousVersion: route.version,
    resultVersion: updated.version,
    details: {
      previousEquivalenceKey: route.equivalenceKey,
      equivalenceKey: updated.equivalenceKey,
      previousIndexPolicy: route.indexPolicy,
      indexPolicy: updated.indexPolicy,
    },
    beforeState: before,
    tags: tagsForSnapshots([snapshot], extra),
  }
}
