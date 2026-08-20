import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const migrationPath = fileURLToPath(
  new URL("./migrations/0001_create_url_registry.sql", import.meta.url)
)
const sql = readFileSync(migrationPath, "utf8")
const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase()
const sqlPatterns = {
  forbiddenAliasJoin:
    /from url_registry\.url_entity_slug (as )?(alias|slug) left join/,
  forbiddenAliasScan: /where (alias|slug)\.disposition = 'alias'/,
  forbiddenSlugTargets: /alias_of|target_slug|canonical_slug|target_route_id/,
  managedTransaction: /\b(begin|commit)\s*;/,
  outboxDispatch:
    /create index url_registry_invalidation_outbox_dispatch_idx[\s\S]*\(status, available_at, id\)[\s\S]*where status in \('pending', 'processing'\)/,
  routeActiveEquivalence:
    /create unique index url_route_active_equivalence_unique[\s\S]*\(market, kind, equivalence_key\)[\s\S]*where status = 'active' and equivalence_key is not null/,
  routeStatus: /status in \('active', 'retired', 'superseded'\)/,
  routeTargetType: /target_type in \('entity', 'static'\)/,
  slugDisposition: /disposition in \('current', 'alias', 'gone'\)/,
  slugOneCurrent:
    /create unique index url_entity_slug_one_current_per_route[\s\S]*\(route_id\)[\s\S]*where disposition = 'current'/,
  staticDisposition: /disposition in \('current', 'alias'\)/,
  staticMatchMode: /match_mode in \('exact', 'prefix'\)/,
  staticOneCurrent:
    /create unique index static_route_path_one_current_per_route[\s\S]*\(market, route_key\)[\s\S]*where disposition = 'current'/,
  commandStatus: /status in \('in_progress', 'completed'\)/,
} as const

const tableDefinition = (tableName: string): string => {
  const startMarker = `create table url_registry.${tableName} (`
  const start = compactSql.indexOf(startMarker)

  if (start < 0) {
    throw new Error(`${tableName} must be created`)
  }

  const definitionStart = start + startMarker.length
  const definitionEnd = compactSql.indexOf(");", definitionStart)

  if (definitionEnd <= definitionStart) {
    throw new Error(`${tableName} must have a complete definition`)
  }

  return compactSql.slice(definitionStart, definitionEnd)
}

describe("URL registry initial migration contract", () => {
  it("uses the checksum-runner migration convention and creates the complete model", () => {
    expect(compactSql).toContain("create schema if not exists url_registry")
    expect(compactSql).not.toMatch(sqlPatterns.managedTransaction)
    expect(compactSql).not.toContain("create extension")
    expect(compactSql).toContain(
      "the only supported runtime write path is the urlr command adapter"
    )
    expect(compactSql).toContain(
      "this migration does not itself revoke owner dml"
    )

    for (const table of [
      "url_route",
      "url_entity_slug",
      "static_route_path",
      "url_registry_command",
      "url_registry_audit",
      "url_registry_invalidation_outbox",
    ]) {
      expect(compactSql).toContain(`create table url_registry.${table}`)
    }
  })

  it("separates logical route lifecycle from immutable slug history", () => {
    const route = tableDefinition("url_route")
    const slug = tableDefinition("url_entity_slug")

    expect(route).toContain("target_type text not null")
    expect(route).toContain("source_system text")
    expect(route).toContain("source_type text")
    expect(route).toContain("source_id text")
    expect(route).toContain("static_route_key text")
    expect(route).toContain("equivalence_key text")
    expect(route).not.toContain("equivalence_key text not null")
    expect(route).toContain("index_policy text not null")
    expect(route).toContain("status text not null")
    expect(route).toContain("successor_route_id uuid")
    expect(route).toContain("version integer not null default 1")
    expect(route).toMatch(sqlPatterns.routeStatus)
    expect(route).toMatch(sqlPatterns.routeTargetType)
    expect(route).toContain("url_route_target_identity_check")
    expect(route).toContain("url_route_target_kind_check")
    expect(route).toContain("target_type = 'static' and kind = 'static'")

    expect(slug).toContain("normalized_slug text not null")
    expect(slug).toContain("route_id uuid")
    expect(slug).toContain("disposition text not null")
    expect(slug).toContain("normalization_version integer not null")
    expect(slug).toMatch(sqlPatterns.slugDisposition)
    expect(slug).toContain("url_entity_slug_route_state_check")
    for (const entityKind of [
      "product",
      "category",
      "brand",
      "collection",
      "campaign",
      "article",
      "page",
    ]) {
      expect(slug).toContain(`'${entityKind}'`)
    }
    expect(slug).not.toContain("'static'")
    expect(slug).not.toMatch(sqlPatterns.forbiddenSlugTargets)
  })

  it("enforces identity, collision, current, and active-equivalence uniqueness", () => {
    expect(compactSql).toContain(
      "unique (market, source_system, source_type, source_id)"
    )
    expect(compactSql).toContain("unique (market, static_route_key)")
    expect(compactSql).toMatch(sqlPatterns.routeActiveEquivalence)
    expect(compactSql).toContain(
      "create index url_route_active_equivalence_lookup_idx on url_registry.url_route (kind, equivalence_key, market) where status = 'active' and equivalence_key is not null"
    )
    expect(compactSql).toContain("unique (market, kind, normalized_slug)")
    expect(compactSql).toMatch(sqlPatterns.slugOneCurrent)
  })

  it("uses composite foreign keys for route scope and a direct active successor", () => {
    const route = tableDefinition("url_route")
    const slug = tableDefinition("url_entity_slug")

    expect(route).toContain("successor_required_status")
    expect(route).toContain(
      "foreign key (successor_route_id, market, kind, successor_required_status)"
    )
    expect(route).toContain(
      "references url_registry.url_route (id, market, kind, status)"
    )
    expect(route).toContain("url_route_successor_state_check")

    expect(slug).toContain("required_route_target_type")
    expect(slug).toContain(
      "foreign key (route_id, market, kind, required_route_target_type)"
    )
    expect(slug).toContain(
      "references url_registry.url_route (id, market, kind, target_type)"
    )
  })

  it("keeps aliases immutable and validates only the affected indexed route", () => {
    expect(compactSql).toContain(
      "create function url_registry.guard_entity_slug_history"
    )
    expect(compactSql).toContain("old.disposition = 'current'")
    expect(compactSql).toContain("new.disposition = 'alias'")
    expect(compactSql).toContain("url entity slug history cannot be deleted")

    expect(compactSql).toContain(
      "create function url_registry.assert_route_projection"
    )
    expect(compactSql).toContain("where route_id = affected_route_id")
    expect(compactSql).toContain("and disposition = 'current'")
    expect(compactSql).toContain("must have exactly one current entity slug")
    expect(compactSql).toContain("must have exactly one current static path")
    expect(compactSql).toContain(
      "current static path version cannot exceed route version"
    )
    expect(compactSql).not.toContain("enforce_direct_alias_target")
    expect(compactSql).not.toContain("alias_of")
  })

  it("models immutable current and historical static route paths", () => {
    const staticPath = tableDefinition("static_route_path")

    expect(staticPath).toContain("market text not null")
    expect(staticPath).toContain("route_key text not null")
    expect(staticPath).toContain("parent_route_key text")
    expect(staticPath).toContain("segment text not null")
    expect(staticPath).toContain("match_mode text not null")
    expect(staticPath).toContain("disposition text not null")
    expect(staticPath).toContain("introduced_in_version integer not null")
    expect(staticPath).toMatch(sqlPatterns.staticMatchMode)
    expect(staticPath).toMatch(sqlPatterns.staticDisposition)
    expect(compactSql).toMatch(sqlPatterns.staticOneCurrent)
    expect(compactSql).toContain(
      "create unique index static_route_path_no_reuse_unique"
    )
    expect(compactSql).toContain("coalesce(parent_route_key, '')")
    expect(compactSql).toContain("static route path history cannot be deleted")
    expect(compactSql).toContain(
      "create function url_registry.assert_static_path_graph"
    )
    expect(compactSql).toContain("with recursive ancestors")
  })

  it("stores replay identity, append-only audit, and atomic invalidation intent", () => {
    const command = tableDefinition("url_registry_command")
    const audit = tableDefinition("url_registry_audit")
    const outbox = tableDefinition("url_registry_invalidation_outbox")

    expect(command).toContain("idempotency_key text primary key")
    expect(command).toContain("producer text not null")
    expect(command).toContain("command_version integer not null")
    expect(command).toContain("command_type text not null")
    expect(command).toContain("request_fingerprint text not null")
    expect(command).toContain("request_fingerprint ~ '^sha256:[0-9a-f]{64}$'")
    expect(command).toContain("source_system text not null")
    expect(command).toContain("source_version text not null")
    expect(command).toContain("source_event_id text not null")
    expect(command).toContain("expected_route_version integer not null")
    expect(command).toContain("expected_route_version >= 0")
    expect(command).toContain("result_route_version integer")
    expect(command).toContain("response_snapshot jsonb")
    expect(command).toContain("completed_at timestamptz")
    expect(command).toContain("outcome text")
    expect(command).toContain("outcome in ('applied', 'noop')")
    expect(command).toMatch(sqlPatterns.commandStatus)
    expect(command).toContain("url_registry_command_source_event_unique")
    expect(compactSql).toContain("(source_system, source_event_id)")
    expect(compactSql).toContain("url registry command cannot be deleted")
    expect(compactSql).toContain(
      "create function url_registry.assert_command_completed"
    )
    expect(compactSql).toContain("if persisted_audit_count <> 1")
    expect(compactSql).toContain(
      "if persisted_outcome = 'applied' and persisted_outbox_count <> 1"
    )
    expect(compactSql).toContain(
      "applied url registry command requires exactly one invalidation outbox record"
    )
    expect(compactSql).toContain(
      "no-op url registry command cannot emit invalidation outbox state"
    )

    expect(audit).toContain("command_idempotency_key text not null")
    expect(audit).toContain("route_version integer")
    expect(audit).toContain("event_payload jsonb not null")
    expect(audit).toContain("unique (command_idempotency_key)")
    expect(compactSql).toContain("url registry audit is append-only")

    expect(outbox).toContain("deduplication_key text not null unique")
    expect(outbox).toContain("invalidation_tags text[] not null")
    expect(outbox).toContain("status text not null default 'pending'")
    expect(outbox).toContain("attempt_count integer not null default 0")
    expect(outbox).toContain("route_version integer")
    expect(outbox).toContain("unique (command_idempotency_key)")
    expect(compactSql).toMatch(sqlPatterns.outboxDispatch)
    expect(compactSql).toContain(
      "create index url_registry_invalidation_outbox_processing_reclaim_idx"
    )
  })

  it("uses targeted deferred checks instead of the legacy full-registry scan", () => {
    expect(compactSql).toContain("deferrable initially deferred")
    expect(compactSql).toContain("affected_route_id")
    expect(compactSql).toContain("affected_route_key")
    expect(compactSql).toContain("transaction-scoped per-market advisory lock")
    expect(compactSql).not.toMatch(sqlPatterns.forbiddenAliasJoin)
    expect(compactSql).not.toMatch(sqlPatterns.forbiddenAliasScan)
    expect(compactSql).not.toContain("using errcode = '40001'")
  })
})
