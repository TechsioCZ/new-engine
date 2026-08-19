import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(
    process.cwd(),
    "src/modules/storefront-url-assignment/migrations/Migration20260819120000.ts"
  ),
  "utf8"
)

describe("collection URL assignment migration", () => {
  it("enforces stable identity, slug uniqueness, status, and source version", () => {
    expect(migrationSource).toContain(
      '"IDX_storefront_url_assignment_identity_unique"'
    )
    expect(migrationSource).toContain(
      '"IDX_storefront_url_assignment_kind_market_slug_unique"'
    )
    expect(migrationSource).toContain(
      '"CHK_storefront_url_assignment_publication_status"'
    )
    expect(migrationSource).toContain(
      '"CHK_storefront_url_assignment_entity_kind"'
    )
    expect(migrationSource).toContain(
      '"CHK_storefront_url_assignment_source_version"'
    )
    expect(migrationSource).toContain(
      '"source_version" integer not null default 1'
    )
  })
})
