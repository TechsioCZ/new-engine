import type {
  ChangeSlugRequest,
  CreateEntityRouteRequest,
  EntityRouteSnapshot,
  UrlRegistryCommand,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import { type RouteCommandDraft, tagsForSnapshots } from "./command-finalizer"
import {
  assertEntityKind,
  assertInteger,
  assertMarket,
  assertMetadata,
  assertMutableRoute,
  assertSegment,
  assertSourceMatchesIdentity,
  assertUuid,
} from "./input-validation"
import { loadRoute, loadSnapshot } from "./snapshot-store"
import type { SqlExecutor } from "./sql"
import { lockTargetRoute } from "./write-context"

const asEntitySnapshot = (
  snapshot: Awaited<ReturnType<typeof loadSnapshot>>
): EntityRouteSnapshot => {
  if (snapshot.projectionType !== "entity") {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      `Route ${snapshot.route.id} is not an entity route`
    )
  }
  return snapshot
}

export const createEntityRoute = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand<CreateEntityRouteRequest>,
  createId: () => string
): Promise<RouteCommandDraft> => {
  const { request } = command
  assertMarket(request.route.market)
  assertEntityKind(request.route.kind)
  assertSourceMatchesIdentity(request.source, request.route.identity)
  assertMetadata(request.route)
  assertSegment(request.slug.normalizedSlug, "normalizedSlug")
  assertInteger(request.slug.normalizationVersion, "normalizationVersion", 1)
  if (request.expectedVersion !== 0) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Create expectedVersion must be 0"
    )
  }
  const routeId = createId()
  const slugId = createId()
  assertUuid(routeId, "generated routeId")
  assertUuid(slugId, "generated slugId")

  await executor.query(
    `INSERT INTO url_registry.url_route (
       id, market, kind, target_type, source_system, source_type, source_id,
       static_route_key, equivalence_key, index_policy, status,
       successor_route_id, version
     ) VALUES ($1, $2, $3, 'entity', $4, $5, $6, NULL, $7, $8,
               'active', NULL, 1)`,
    [
      routeId,
      request.route.market,
      request.route.kind,
      request.route.identity.sourceSystem,
      request.route.identity.sourceType,
      request.route.identity.sourceId,
      request.route.equivalenceKey,
      request.route.indexPolicy,
    ]
  )
  await executor.query(
    `INSERT INTO url_registry.url_entity_slug (
       id, market, kind, normalized_slug, route_id, disposition,
       normalization_version
     ) VALUES ($1, $2, $3, $4, $5, 'current', $6)`,
    [
      slugId,
      request.route.market,
      request.route.kind,
      request.slug.normalizedSlug,
      routeId,
      request.slug.normalizationVersion,
    ]
  )
  const insertedRoute = await loadRoute(executor, routeId)
  if (!insertedRoute || insertedRoute.targetType !== "entity") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Inserted entity route could not be read back"
    )
  }
  const snapshot = asEntitySnapshot(await loadSnapshot(executor, insertedRoute))
  return {
    kind: "route",
    snapshot,
    outcome: "applied",
    routeId,
    affectedRouteIds: [routeId],
    previousVersion: null,
    resultVersion: 1,
    details: { normalizedSlug: request.slug.normalizedSlug },
    beforeState: null,
    tags: tagsForSnapshots([snapshot]),
  }
}

export const changeEntitySlug = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand<ChangeSlugRequest>,
  createId: () => string
): Promise<RouteCommandDraft> => {
  const { request } = command
  assertUuid(request.target.routeId, "target.routeId")
  assertSegment(request.slug.normalizedSlug, "normalizedSlug")
  assertInteger(request.slug.normalizationVersion, "normalizationVersion", 1)
  const route = await lockTargetRoute(
    executor,
    request.target,
    request.source,
    request.expectedVersion
  )
  assertMutableRoute(route, request.expectedVersion)
  if (route.targetType !== "entity") {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      `Route ${route.id} is not an entity route`
    )
  }
  const before = asEntitySnapshot(await loadSnapshot(executor, route))
  if (before.currentSlug.normalizedSlug === request.slug.normalizedSlug) {
    if (
      before.currentSlug.normalizationVersion !==
      request.slug.normalizationVersion
    ) {
      throw new UrlRegistryError(
        "INVALID_TRANSITION",
        "A current slug cannot change normalization version in place"
      )
    }
    return {
      kind: "route",
      snapshot: before,
      outcome: "noop",
      routeId: route.id,
      affectedRouteIds: [route.id],
      previousVersion: route.version,
      resultVersion: route.version,
      details: { reason: "same-current-slug" },
      beforeState: before,
      tags: null,
    }
  }

  const slugId = createId()
  assertUuid(slugId, "generated slugId")
  await executor.query(
    `UPDATE url_registry.url_entity_slug
        SET disposition = 'alias'
      WHERE id = $1 AND disposition = 'current'`,
    [before.currentSlug.id]
  )
  await executor.query(
    `INSERT INTO url_registry.url_entity_slug (
       id, market, kind, normalized_slug, route_id, disposition,
       normalization_version
     ) VALUES ($1, $2, $3, $4, $5, 'current', $6)`,
    [
      slugId,
      route.market,
      route.kind,
      request.slug.normalizedSlug,
      route.id,
      request.slug.normalizationVersion,
    ]
  )
  await executor.query(
    `UPDATE url_registry.url_route
        SET version = version + 1
      WHERE id = $1`,
    [route.id]
  )
  const updated = await loadRoute(executor, route.id)
  if (!updated || updated.targetType !== "entity") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Updated route disappeared"
    )
  }
  const snapshot = asEntitySnapshot(await loadSnapshot(executor, updated))
  return {
    kind: "route",
    snapshot,
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds: [route.id],
    previousVersion: route.version,
    resultVersion: updated.version,
    details: {
      previousSlug: before.currentSlug.normalizedSlug,
      currentSlug: snapshot.currentSlug.normalizedSlug,
    },
    beforeState: before,
    tags: tagsForSnapshots(
      [snapshot],
      [
        `route-slug:${route.market}:${route.kind}:${before.currentSlug.normalizedSlug}`,
      ]
    ),
  }
}
