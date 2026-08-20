import type {
  EntityRouteMutationResult,
  EntityRouteSnapshot,
  GoneMutationResult,
  StaticRouteMutationResult,
  StaticRouteSnapshot,
  UrlRegistryAuditRecord,
  UrlRegistryCommandRequest,
  UrlRegistryInvalidationOutboxRecord,
} from "../contracts"
import {
  parseEntitySlugValue,
  parseRouteValue,
  parseStaticPathValue,
} from "./row-codec"
import {
  asInteger,
  asIsoTimestamp,
  asNullableInteger,
  asNullableString,
  asRecord,
  asString,
  asStringArray,
  oneOf,
} from "./runtime"

export type StoredCommandResult =
  | EntityRouteMutationResult
  | StaticRouteMutationResult
  | GoneMutationResult

const actions: readonly UrlRegistryCommandRequest["commandType"][] = [
  "create-entity-route",
  "create-static-route",
  "change-slug",
  "change-static-path",
  "update-route",
  "retire-route",
  "supersede-route",
  "register-gone",
]

const parseAudit = (value: unknown): UrlRegistryAuditRecord => {
  const row = asRecord(value, "stored commit audit")
  const source = asRecord(row.source, "stored commit audit source")
  const commandVersion = asInteger(row.commandVersion, "audit.commandVersion")
  if (commandVersion !== 1) {
    throw new TypeError("stored audit commandVersion must be 1")
  }
  return {
    id: asString(row.id, "audit.id"),
    commandVersion,
    idempotencyKey: asString(row.idempotencyKey, "audit.idempotencyKey"),
    requestFingerprint: asString(
      row.requestFingerprint,
      "audit.requestFingerprint"
    ),
    action: oneOf(row.action, actions, "audit.action"),
    outcome: oneOf(row.outcome, ["applied", "noop"] as const, "audit.outcome"),
    routeId: asNullableString(row.routeId, "audit.routeId"),
    affectedRouteIds: asStringArray(
      row.affectedRouteIds,
      "audit.affectedRouteIds"
    ),
    source: {
      producer: asString(source.producer, "audit.source.producer"),
      sourceSystem: asString(source.sourceSystem, "audit.source.sourceSystem"),
      sourceType: asString(source.sourceType, "audit.source.sourceType"),
      sourceId: asString(source.sourceId, "audit.source.sourceId"),
      sourceVersion: asString(
        source.sourceVersion,
        "audit.source.sourceVersion"
      ),
      sourceEventId: asString(
        source.sourceEventId,
        "audit.source.sourceEventId"
      ),
    },
    previousVersion: asNullableInteger(
      row.previousVersion,
      "audit.previousVersion"
    ),
    resultVersion: asNullableInteger(row.resultVersion, "audit.resultVersion"),
    details: asRecord(row.details, "audit.details"),
    createdAt: asIsoTimestamp(row.createdAt, "audit.createdAt"),
  }
}

const parseInvalidation = (
  value: unknown
): UrlRegistryInvalidationOutboxRecord | null => {
  if (value === null) {
    return null
  }
  const row = asRecord(value, "stored commit invalidation")
  return {
    id: asString(row.id, "invalidation.id"),
    auditId: asString(row.auditId, "invalidation.auditId"),
    idempotencyKey: asString(row.idempotencyKey, "invalidation.idempotencyKey"),
    status: oneOf(row.status, ["pending"] as const, "invalidation.status"),
    tags: asStringArray(row.tags, "invalidation.tags"),
    createdAt: asIsoTimestamp(row.createdAt, "invalidation.createdAt"),
  }
}

const parseCommit = (value: unknown) => {
  const row = asRecord(value, "stored commit")
  if (typeof row.replayed !== "boolean") {
    throw new TypeError("stored commit replayed must be boolean")
  }
  return {
    outcome: oneOf(row.outcome, ["applied", "noop"] as const, "commit.outcome"),
    replayed: row.replayed,
    audit: parseAudit(row.audit),
    invalidation: parseInvalidation(row.invalidation),
  }
}

const parseEntitySnapshot = (value: unknown): EntityRouteSnapshot => {
  const row = asRecord(value, "stored entity snapshot")
  const route = parseRouteValue(row.route)
  if (route.targetType !== "entity") {
    throw new TypeError("stored entity snapshot contains a static route")
  }
  if (!Array.isArray(row.slugHistory)) {
    throw new TypeError("stored entity slugHistory must be an array")
  }
  return {
    projectionType: oneOf(
      row.projectionType,
      ["entity"] as const,
      "snapshot.projectionType"
    ),
    route,
    currentSlug: parseEntitySlugValue(row.currentSlug),
    slugHistory: row.slugHistory.map(parseEntitySlugValue),
  }
}

const parseStaticSnapshot = (value: unknown): StaticRouteSnapshot => {
  const row = asRecord(value, "stored static snapshot")
  const route = parseRouteValue(row.route)
  if (route.targetType !== "static") {
    throw new TypeError("stored static snapshot contains an entity route")
  }
  if (!Array.isArray(row.pathHistory)) {
    throw new TypeError("stored static pathHistory must be an array")
  }
  return {
    projectionType: oneOf(
      row.projectionType,
      ["static"] as const,
      "snapshot.projectionType"
    ),
    route,
    currentPath: parseStaticPathValue(row.currentPath),
    pathHistory: row.pathHistory.map(parseStaticPathValue),
  }
}

export const parseStoredCommandResult = (
  value: unknown,
  commandType: UrlRegistryCommandRequest["commandType"]
): StoredCommandResult => {
  const row = asRecord(value, "stored command response")
  const commit = parseCommit(row.commit)
  if (commit.audit.action !== commandType) {
    throw new TypeError(
      "stored command response action does not match its ledger"
    )
  }
  if (commandType === "register-gone") {
    return { slug: parseEntitySlugValue(row.slug), commit }
  }
  const affectedRouteIds = asStringArray(
    row.affectedRouteIds,
    "response.affectedRouteIds"
  )
  const snapshot = asRecord(row.snapshot, "response.snapshot")
  return snapshot.projectionType === "entity"
    ? { snapshot: parseEntitySnapshot(snapshot), affectedRouteIds, commit }
    : { snapshot: parseStaticSnapshot(snapshot), affectedRouteIds, commit }
}

export const replayStoredResult = (
  result: StoredCommandResult
): StoredCommandResult => ({
  ...result,
  commit: { ...result.commit, replayed: true },
})
