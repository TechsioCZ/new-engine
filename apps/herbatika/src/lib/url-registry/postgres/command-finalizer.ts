import { createHash } from "node:crypto"
import type {
  GoneMutationResult,
  RouteMutationResult,
  UrlEntitySlug,
  UrlRegistryAuditRecord,
  UrlRegistryCommand,
  UrlRegistryCommandCommit,
  UrlRegistryInvalidationOutboxRecord,
  UrlRouteSnapshot,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import {
  assertBoundedUrlRegistryInvalidationTags,
  invalidationTagsForSnapshots,
} from "../invalidation-tags"
import { asIsoTimestamp, asRecord, asString } from "./runtime"
import type { SqlExecutor } from "./sql"

type CommitDraft = Readonly<{
  outcome: "applied" | "noop"
  routeId: string | null
  affectedRouteIds: readonly string[]
  previousVersion: number | null
  resultVersion: number | null
  details: Readonly<Record<string, unknown>>
  beforeState: unknown | null
  affectedAfterSnapshots?: readonly UrlRouteSnapshot[]
  tags: readonly string[] | null
}>

export type RouteCommandDraft = CommitDraft &
  Readonly<{ kind: "route"; snapshot: UrlRouteSnapshot }>

export type GoneCommandDraft = CommitDraft &
  Readonly<{ kind: "gone"; slug: UrlEntitySlug }>

export type CommandDraft = RouteCommandDraft | GoneCommandDraft

const compareText = (left: string, right: string) => {
  if (left < right) {
    return -1
  }
  return left > right ? 1 : 0
}

const sortedUnique = (values: readonly string[]) =>
  [...new Set(values)].sort(compareText)

export const tagsForSnapshots = (
  snapshots: readonly UrlRouteSnapshot[],
  extra: readonly string[] = []
): string[] => invalidationTagsForSnapshots(snapshots, extra)

const insertAudit = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand,
  draft: CommandDraft
): Promise<UrlRegistryAuditRecord> => {
  const eventPayload = {
    commandVersion: command.commandVersion,
    idempotencyKey: command.idempotencyKey,
    requestFingerprint: command.requestFingerprint,
    action: command.request.commandType,
    outcome: draft.outcome,
    routeId: draft.routeId,
    affectedRouteIds: sortedUnique(draft.affectedRouteIds),
    source: command.request.source,
    previousVersion: draft.previousVersion,
    resultVersion: draft.resultVersion,
    details: draft.details,
  }
  const afterState =
    draft.kind === "route"
      ? {
          snapshot: draft.snapshot,
          affectedRouteIds: draft.affectedRouteIds,
          affectedRouteSnapshots: draft.affectedAfterSnapshots ?? [
            draft.snapshot,
          ],
        }
      : { slug: draft.slug }
  const inserted = await executor.query(
    `INSERT INTO url_registry.url_registry_audit (
       command_idempotency_key, route_id, route_version, event_type,
       before_state, after_state, event_payload
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
     RETURNING id::text AS id, created_at`,
    [
      command.idempotencyKey,
      draft.routeId,
      draft.resultVersion,
      command.request.commandType,
      draft.beforeState === null ? null : JSON.stringify(draft.beforeState),
      JSON.stringify(afterState),
      JSON.stringify(eventPayload),
    ]
  )
  if (inserted.rows.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "URL registry audit insert did not return exactly one row"
    )
  }
  const row = asRecord(inserted.rows[0], "inserted audit row")
  return {
    ...eventPayload,
    id: asString(row.id, "audit.id"),
    createdAt: asIsoTimestamp(row.created_at, "audit.created_at"),
  }
}

const insertInvalidation = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand,
  draft: CommandDraft,
  audit: UrlRegistryAuditRecord
): Promise<UrlRegistryInvalidationOutboxRecord | null> => {
  if (draft.tags === null) {
    return null
  }
  const tags = sortedUnique(draft.tags)
  assertBoundedUrlRegistryInvalidationTags(tags)
  const digest = createHash("sha256")
    .update(command.idempotencyKey)
    .digest("hex")
  const inserted = await executor.query(
    `INSERT INTO url_registry.url_registry_invalidation_outbox (
       command_idempotency_key, audit_id, route_id, route_version,
       deduplication_key, invalidation_tags, payload
     ) VALUES ($1, $2::bigint, $3, $4, $5, $6::text[], $7::jsonb)
     RETURNING id::text AS id, audit_id::text AS audit_id, status,
               invalidation_tags, created_at`,
    [
      command.idempotencyKey,
      audit.id,
      draft.routeId,
      draft.resultVersion,
      `urlr:${digest}`,
      tags,
      JSON.stringify({
        action: command.request.commandType,
        affectedRouteIds: draft.affectedRouteIds,
        tags,
      }),
    ]
  )
  if (inserted.rows.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "URL registry outbox insert did not return exactly one row"
    )
  }
  const row = asRecord(inserted.rows[0], "inserted outbox row")
  const persistedTags = row.invalidation_tags
  if (
    !Array.isArray(persistedTags) ||
    persistedTags.some((tag) => typeof tag !== "string")
  ) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Inserted outbox tags have an invalid shape"
    )
  }
  if (row.status !== "pending") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "New URL registry invalidation must be pending"
    )
  }
  return {
    id: asString(row.id, "outbox.id"),
    auditId: asString(row.audit_id, "outbox.audit_id"),
    idempotencyKey: command.idempotencyKey,
    status: "pending",
    tags: persistedTags as string[],
    createdAt: asIsoTimestamp(row.created_at, "outbox.created_at"),
  }
}

export const finalizeCommand = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand,
  draft: CommandDraft
): Promise<RouteMutationResult | GoneMutationResult> => {
  const audit = await insertAudit(executor, command, draft)
  const invalidation = await insertInvalidation(executor, command, draft, audit)
  const commit: UrlRegistryCommandCommit = {
    outcome: draft.outcome,
    replayed: false,
    audit,
    invalidation,
  }
  const result: RouteMutationResult | GoneMutationResult =
    draft.kind === "route"
      ? ({
          snapshot: draft.snapshot,
          affectedRouteIds: sortedUnique(draft.affectedRouteIds),
          commit,
        } as RouteMutationResult)
      : { slug: draft.slug, commit }
  const completed = await executor.query(
    `UPDATE url_registry.url_registry_command
        SET status = 'completed', outcome = $2, route_id = $3,
            result_route_version = $4, response_snapshot = $5::jsonb,
            completed_at = clock_timestamp()
      WHERE idempotency_key = $1 AND status = 'in_progress'
      RETURNING idempotency_key`,
    [
      command.idempotencyKey,
      draft.outcome,
      draft.routeId,
      draft.resultVersion,
      JSON.stringify(result),
    ]
  )
  if (completed.rows.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "URL registry command ledger completion affected no row"
    )
  }
  return result
}
