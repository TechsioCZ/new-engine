import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const migrationPath = fileURLToPath(
  new URL("./migrations/0002_create_source_event_tracking.sql", import.meta.url)
)
const sql = readFileSync(migrationPath, "utf8")
const compactSql = sql.replace(/\s+/g, " ").trim().toLowerCase()
const commandUpgradePath = fileURLToPath(
  new URL(
    "./migrations/0003_generalize_source_event_receipts.sql",
    import.meta.url
  )
)
const commandUpgradeSql = readFileSync(commandUpgradePath, "utf8")
const compactCommandUpgradeSql = commandUpgradeSql
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase()
const catalogRetirementUpgradePath = fileURLToPath(
  new URL(
    "./migrations/0005_allow_catalog_unpublish_retirement.sql",
    import.meta.url
  )
)
const catalogRetirementUpgradeSql = readFileSync(
  catalogRetirementUpgradePath,
  "utf8"
)
const compactCatalogRetirementUpgradeSql = catalogRetirementUpgradeSql
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase()
const MANAGED_TRANSACTION = /\b(begin|commit)\s*;/

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

describe("URL registry source-event tracking migration", () => {
  it("creates an immutable source-event receipt with the complete identity", () => {
    expect(compactSql).not.toMatch(MANAGED_TRANSACTION)

    const receipt = tableDefinition("url_registry_source_event_receipt")
    expect(receipt).toContain("source_system text not null")
    expect(receipt).toContain("source_type text not null")
    expect(receipt).toContain("source_id text not null")
    expect(receipt).toContain("market text not null")
    expect(receipt).toContain("stream_sequence integer not null")
    expect(receipt).toContain("stream_sequence > 0")
    expect(receipt).toContain("source_event_id text not null")
    expect(receipt).toContain("envelope_fingerprint text not null")
    expect(receipt).toContain("envelope_fingerprint ~ '^sha256:[0-9a-f]{64}$'")
    expect(receipt).toContain("change_type text not null")
    expect(receipt).toContain("change_type in ('reconcile', 'delete')")
    expect(receipt).toContain("action text not null")
    expect(receipt).toContain("command_idempotency_key text")
    expect(receipt).toContain("created_at timestamptz not null")
    expect(receipt).not.toContain("delivery_outcome")
    expect(compactSql).not.toContain("noop-stale")
    expect(receipt).toContain(
      "primary key ( source_system, source_type, source_id, market, stream_sequence )"
    )
    expect(receipt).toContain("unique (source_system, source_event_id, market)")
    expect(receipt).toContain("unique (command_idempotency_key)")
  })

  it("restricts actions by lifecycle change and links only retirement commands", () => {
    const receipt = tableDefinition("url_registry_source_event_receipt")

    for (const action of [
      "retired",
      "noop-source-present",
      "noop-source-missing",
      "noop-route-missing",
      "noop-route-terminal",
      "requires-publication",
    ]) {
      expect(receipt).toContain(`'${action}'`)
    }
    expect(receipt).toContain(
      "change_type = 'reconcile' and action in ( 'noop-source-present', 'noop-source-missing', 'requires-publication' )"
    )
    expect(receipt).toContain(
      "change_type = 'delete' and action in ( 'retired', 'noop-source-present', 'noop-route-missing', 'noop-route-terminal' )"
    )
    expect(receipt).toContain(
      "action = 'retired' and command_idempotency_key is not null"
    )
    expect(receipt).toContain(
      "action <> 'retired' and command_idempotency_key is null"
    )
    expect(receipt).toContain(
      "foreign key (command_idempotency_key) references url_registry.url_registry_command (idempotency_key) deferrable initially deferred"
    )
    expect(compactSql).toContain(
      "create function url_registry.assert_url_registry_source_event_retirement_command"
    )
    expect(compactSql).toContain(
      "persisted_command.command_type = 'retire-route'"
    )
    expect(compactSql).toContain("persisted_command.status = 'completed'")
    expect(compactSql).toContain("persisted_command.outcome = 'applied'")
    expect(compactSql).toContain(
      "persisted_command.source_system = new.source_system"
    )
    expect(compactSql).toContain(
      "persisted_command.source_type = new.source_type"
    )
    expect(compactSql).toContain("persisted_command.source_id = new.source_id")
    expect(compactSql).toContain(
      "persisted_command.source_event_id = new.source_event_id"
    )
    expect(compactSql).toContain("route.market = new.market")
    expect(compactSql).toContain(
      "create constraint trigger url_registry_source_event_retirement_command_deferred"
    )
  })

  it("keeps receipts append-only", () => {
    expect(compactSql).toContain(
      "create trigger url_registry_source_event_receipt_append_only"
    )
    expect(compactSql).toContain(
      "before update or delete on url_registry.url_registry_source_event_receipt"
    )
    expect(compactSql).toContain(
      "'url registry source event receipt is append-only'"
    )
  })

  it("starts each source cursor at one and advances it exactly once", () => {
    const cursor = tableDefinition("url_registry_source_event_cursor")
    expect(cursor).toContain("last_sequence integer not null")
    expect(cursor).toContain("last_sequence > 0")
    expect(cursor).toContain(
      "primary key (source_system, source_type, source_id, market)"
    )
    expect(cursor).toContain("created_at timestamptz not null")
    expect(cursor).toContain("updated_at timestamptz not null")
    expect(cursor).toContain("updated_at >= created_at")
    expect(compactSql).toContain(
      "create function url_registry.guard_url_registry_source_event_cursor"
    )
    expect(compactSql).toContain("new.last_sequence <> 1")
    expect(compactSql).toContain("new.last_sequence <> old.last_sequence + 1")
    expect(compactSql).toContain("source event cursor identity is immutable")
    expect(compactSql).toContain("source event cursor cannot be deleted")
  })

  it("defers both sides of the receipt-to-cursor invariant until commit", () => {
    const cursor = tableDefinition("url_registry_source_event_cursor")
    expect(cursor).toContain(
      "foreign key ( source_system, source_type, source_id, market, last_sequence ) references url_registry.url_registry_source_event_receipt ( source_system, source_type, source_id, market, stream_sequence ) deferrable initially deferred"
    )
    expect(compactSql).toContain(
      "create function url_registry.assert_url_registry_source_event_receipt_cursor"
    )
    expect(compactSql).toContain(
      "persisted_last_sequence < new.stream_sequence"
    )
    expect(compactSql).toContain(
      "create constraint trigger url_registry_source_event_receipt_cursor_deferred"
    )
    expect(compactSql).toContain("after insert on")
    expect(compactSql).toContain("deferrable initially deferred")
    expect(compactSql).toContain(
      "create function url_registry.assert_url_registry_source_event_cursor_receipt"
    )
    expect(compactSql).toContain("stream_sequence = new.last_sequence")
    expect(compactSql).toContain(
      "create constraint trigger url_registry_source_event_cursor_receipt_deferred"
    )
    expect(compactSql).toContain("after insert or update on")
  })
})

describe("URL registry source-event command receipt upgrade", () => {
  it("preserves the immutable version-two migration and replaces its constraints", () => {
    expect(compactCommandUpgradeSql).not.toMatch(MANAGED_TRANSACTION)
    expect(compactCommandUpgradeSql).toContain(
      "drop constraint url_registry_source_event_receipt_action_check"
    )
    expect(compactCommandUpgradeSql).toContain(
      "drop constraint url_registry_source_event_receipt_change_action_check"
    )
    expect(compactCommandUpgradeSql).toContain(
      "drop constraint url_registry_source_event_receipt_command_check"
    )
    expect(compactCommandUpgradeSql).toContain(
      "drop trigger url_registry_source_event_retirement_command_deferred"
    )
    expect(compactCommandUpgradeSql).toContain(
      "drop function url_registry.assert_url_registry_source_event_retirement_command()"
    )
  })

  it("supports the complete reconcile lifecycle without weakening delete receipts", () => {
    for (const action of [
      "published",
      "slug-changed",
      "unpublished",
      "noop-unpublished",
    ]) {
      expect(compactCommandUpgradeSql).toContain(`'${action}'`)
    }
    expect(compactCommandUpgradeSql).toContain(
      "change_type = 'reconcile' and action in ( 'published', 'slug-changed', 'unpublished', 'noop-unpublished', 'noop-source-present', 'noop-source-missing', 'requires-publication' )"
    )
    expect(compactCommandUpgradeSql).toContain(
      "change_type = 'delete' and action in ( 'retired', 'noop-source-present', 'noop-route-missing', 'noop-route-terminal' )"
    )
    expect(compactCommandUpgradeSql).toContain(
      "action in ('published', 'slug-changed', 'retired') and command_idempotency_key is not null"
    )
    expect(compactCommandUpgradeSql).toContain(
      "action not in ('published', 'slug-changed', 'retired') and command_idempotency_key is null"
    )
  })

  it("validates every command-bearing receipt against its exact URLR command", () => {
    expect(compactCommandUpgradeSql).toContain(
      "create function url_registry.assert_url_registry_source_event_command"
    )
    expect(compactCommandUpgradeSql).toContain(
      "when 'published' then 'create-entity-route'"
    )
    expect(compactCommandUpgradeSql).toContain(
      "when 'slug-changed' then 'change-slug'"
    )
    expect(compactCommandUpgradeSql).toContain(
      "when 'retired' then 'retire-route'"
    )
    expect(compactCommandUpgradeSql).toContain(
      "persisted_command.status = 'completed'"
    )
    expect(compactCommandUpgradeSql).toContain(
      "persisted_command.outcome = 'applied'"
    )
    expect(compactCommandUpgradeSql).toContain(
      "persisted_command.source_system = new.source_system"
    )
    expect(compactCommandUpgradeSql).toContain(
      "persisted_command.source_type = new.source_type"
    )
    expect(compactCommandUpgradeSql).toContain(
      "persisted_command.source_id = new.source_id"
    )
    expect(compactCommandUpgradeSql).toContain(
      "persisted_command.source_event_id = new.source_event_id"
    )
    expect(compactCommandUpgradeSql).toContain("route.market = new.market")
    expect(compactCommandUpgradeSql).toContain(
      "create constraint trigger url_registry_source_event_command_deferred"
    )
  })
})

describe("URL registry catalog retirement receipt expansion", () => {
  it("bounds the table lock and preflights historical receipts", () => {
    expect(compactCatalogRetirementUpgradeSql).toContain(
      "set local lock_timeout = '5s'"
    )
    expect(compactCatalogRetirementUpgradeSql).toContain("do $preflight$")
    expect(compactCatalogRetirementUpgradeSql).toContain(
      "contains source-event receipts incompatible with migration 0005"
    )
    expect(compactCatalogRetirementUpgradeSql).not.toContain(
      "delete from url_registry.url_registry_source_event_receipt"
    )
    expect(compactCatalogRetirementUpgradeSql).not.toContain(
      "update url_registry.url_registry_source_event_receipt"
    )
  })

  it("keeps legacy commandless unpublished rows while adding exact retire commands", () => {
    expect(compactCatalogRetirementUpgradeSql).toContain(
      "action = 'unpublished' and ( command_idempotency_key is null or source_type in ('product', 'category', 'brand', 'collection') )"
    )
    expect(compactCatalogRetirementUpgradeSql).toContain(
      "when 'unpublished' then case when new.source_type in ('product', 'category', 'brand', 'collection') then 'retire-route'"
    )
    expect(compactCatalogRetirementUpgradeSql).toContain(
      "persisted_command.command_type = expected_command_type"
    )
  })
})
