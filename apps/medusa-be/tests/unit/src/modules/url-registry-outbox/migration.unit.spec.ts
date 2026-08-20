import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const MIGRATION_FILE_PATTERN = /^Migration\d+\.ts$/
const migrationDirectory = join(
  process.cwd(),
  "src/modules/url-registry-outbox/migrations"
)
const migrationFile = readdirSync(migrationDirectory).find((name) =>
  MIGRATION_FILE_PATTERN.test(name)
)

if (!migrationFile) {
  throw new Error("URL registry outbox migration is missing")
}

const sql = readFileSync(join(migrationDirectory, migrationFile), "utf8")
  .toLowerCase()
  .replaceAll(/\s+/g, " ")

describe("URL registry outbox migration", () => {
  it("persists one immutable ordered stream per product and market", () => {
    expect(sql).toContain(
      'create table if not exists "url_registry_outbox_stream"'
    )
    expect(sql).toContain('"source", "entity_kind", "entity_id", "market_code"')
    expect(sql).toContain("url_registry_outbox_stream_sequence_check")
    expect(sql).toContain("url_registry_outbox_stream_event_identity_unique")
    expect(sql).toContain("create function guard_url_registry_outbox_stream")
    expect(sql).toContain("url registry outbox stream identity is immutable")
    expect(sql).toContain("url registry outbox stream cannot be deleted")
  })

  it("keeps source events immutable while allowing explicit delivery state", () => {
    expect(sql).toContain(
      'create table if not exists "url_registry_outbox_event"'
    )
    expect(sql).toContain("url_registry_outbox_event_delivery_state_check")
    expect(sql).toContain("url_registry_outbox_event_payload_check")
    expect(sql).toContain("url_registry_outbox_event_stream_identity_foreign")
    expect(sql).toContain(") is true);")
    expect(sql).toContain("create function guard_url_registry_outbox_event")
    expect(sql).toContain("url registry outbox event envelope is immutable")
    expect(sql).toContain("url registry outbox event cannot be deleted")
    expect(sql).toContain("terminal url registry outbox event is immutable")
    expect(sql).toContain("invalid url registry outbox delivery transition")
  })

  it("stores source facts rather than URLR-owned route state", () => {
    expect(sql).not.toContain('"route_id"')
    expect(sql).not.toContain('"expected_version"')
    expect(sql).not.toContain('"normalized_slug"')
  })
})
