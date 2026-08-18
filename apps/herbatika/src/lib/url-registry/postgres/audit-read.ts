import type {
  SourceReadResult,
  UrlRegistryAuditRecord,
  UrlRegistryCommandRequest,
  UrlRegistryInvalidationOutboxRecord,
  UrlRegistryPage,
  UrlRegistryPageRequest,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import { buildPage, decodePageRequest, type PageCursor } from "./pagination"
import { executePrimaryRead } from "./primary-read"
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
import type { SqlExecutor, SqlPool } from "./sql"

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

const parseAuditRow = (value: unknown): UrlRegistryAuditRecord => {
  const row = asRecord(value, "URL registry audit row")
  const payload = asRecord(row.event_payload, "URL registry audit payload")
  const source = asRecord(payload.source, "URL registry audit source")
  const commandVersion = asInteger(
    payload.commandVersion,
    "audit.commandVersion"
  )
  if (commandVersion !== 1) {
    throw new TypeError("Audit command version must be 1")
  }
  return {
    id: asString(row.id, "audit.id"),
    commandVersion,
    idempotencyKey: asString(payload.idempotencyKey, "audit.idempotencyKey"),
    requestFingerprint: asString(
      payload.requestFingerprint,
      "audit.requestFingerprint"
    ),
    action: oneOf(payload.action, actions, "audit.action"),
    outcome: oneOf(
      payload.outcome,
      ["applied", "noop"] as const,
      "audit.outcome"
    ),
    routeId: asNullableString(payload.routeId, "audit.routeId"),
    affectedRouteIds: asStringArray(
      payload.affectedRouteIds,
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
      payload.previousVersion,
      "audit.previousVersion"
    ),
    resultVersion: asNullableInteger(
      payload.resultVersion,
      "audit.resultVersion"
    ),
    details: asRecord(payload.details, "audit.details"),
    createdAt: asIsoTimestamp(row.created_at, "audit.created_at"),
  }
}

const assertCursorExists = async (
  executor: SqlExecutor,
  table: "url_registry_audit" | "url_registry_invalidation_outbox",
  cursor: PageCursor | null
) => {
  if (!cursor) {
    return
  }
  const result = await executor.query(
    `SELECT created_at
       FROM url_registry.${table}
      WHERE id = $1::bigint`,
    [cursor.id]
  )
  const row =
    result.rows.length === 1 ? asRecord(result.rows[0], "cursor row") : null
  if (
    row === null ||
    asIsoTimestamp(row.created_at, "cursor.created_at") !== cursor.createdAt
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Cursor does not identify a record in this collection"
    )
  }
}

export const listAudits = async (
  pool: SqlPool,
  input: UrlRegistryPageRequest
): Promise<SourceReadResult<UrlRegistryPage<UrlRegistryAuditRecord>>> => {
  const request = decodePageRequest(input, "audit")
  return await executePrimaryRead(pool, async (executor) => {
    await assertCursorExists(executor, "url_registry_audit", request.cursor)
    const result = await executor.query(
      `SELECT id::text AS id, event_payload, created_at
         FROM url_registry.url_registry_audit
        WHERE id > $1::bigint
        ORDER BY id
        LIMIT $2`,
      [request.cursor?.id ?? "0", request.limit + 1]
    )
    return buildPage(result.rows.map(parseAuditRow), request.limit, "audit")
  })
}

export const listPendingOutbox = async (
  pool: SqlPool,
  input: UrlRegistryPageRequest
): Promise<
  SourceReadResult<UrlRegistryPage<UrlRegistryInvalidationOutboxRecord>>
> => {
  const request = decodePageRequest(input, "pending-outbox")
  return await executePrimaryRead(pool, async (executor) => {
    await assertCursorExists(
      executor,
      "url_registry_invalidation_outbox",
      request.cursor
    )
    const result = await executor.query(
      `SELECT id::text AS id, audit_id::text AS audit_id,
              command_idempotency_key, status, invalidation_tags, created_at
        FROM url_registry.url_registry_invalidation_outbox
        WHERE status = 'pending'
          AND id > $1::bigint
        ORDER BY id
        LIMIT $2`,
      [request.cursor?.id ?? "0", request.limit + 1]
    )
    const records = result.rows.map(
      (value): UrlRegistryInvalidationOutboxRecord => {
        const row = asRecord(value, "URL registry outbox row")
        return {
          id: asString(row.id, "outbox.id"),
          auditId: asString(row.audit_id, "outbox.audit_id"),
          idempotencyKey: asString(
            row.command_idempotency_key,
            "outbox.command_idempotency_key"
          ),
          status: oneOf(row.status, ["pending"] as const, "outbox.status"),
          tags: asStringArray(
            row.invalidation_tags,
            "outbox.invalidation_tags"
          ),
          createdAt: asIsoTimestamp(row.created_at, "outbox.created_at"),
        }
      }
    )
    return buildPage(records, request.limit, "pending-outbox")
  })
}
