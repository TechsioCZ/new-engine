import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(
    process.cwd(),
    "src/modules/market-variant-authority/migrations/Migration20260820220000.ts"
  ),
  "utf8"
)
  .toLowerCase()
  .replaceAll(/\s+/g, " ")

describe("market variant authority migration", () => {
  it("enforces one current row for each market product variant identity", () => {
    expect(migrationSource).toContain(
      'create unique index "idx_market_variant_authority_current_unique" on "market_variant_authority" ("market_code", "product_id", "variant_id") where "deleted_at" is null'
    )
    expect(migrationSource).not.toContain(
      '"idx_market_variant_authority_market_product"'
    )
  })

  it("constrains availability, hashes, source versions, and provenance", () => {
    expect(migrationSource).toContain(
      '"chk_market_variant_authority_availability"'
    )
    expect(migrationSource).toContain("('sellable', 'unavailable')")
    expect(migrationSource).toContain(
      '"product_id" = btrim("product_id") and "product_id" <> \'\''
    )
    expect(migrationSource).toContain(
      '"variant_id" = btrim("variant_id") and "variant_id" <> \'\''
    )
    expect(migrationSource).toContain('"chk_market_variant_authority_sha256"')
    expect(migrationSource).toContain("^[0-9a-f]{64}$")
    expect(migrationSource).toContain(
      '"chk_market_variant_authority_source_version"'
    )
    expect(migrationSource).toContain(
      '"source_version" = btrim("source_version")'
    )
    expect(migrationSource).toContain(
      "jsonb_typeof(\"approval_provenance\") = 'object'"
    )
    expect(migrationSource).toContain(
      "jsonb_typeof(\"source_provenance\") = 'object'"
    )
  })

  it("owns a strict reversible table boundary", () => {
    expect(migrationSource).toContain('create table "market_variant_authority"')
    expect(migrationSource).not.toContain(
      'create table if not exists "market_variant_authority"'
    )
    expect(migrationSource).toContain('drop table "market_variant_authority";')
    expect(migrationSource).not.toContain(
      'drop table "market_variant_authority" cascade'
    )
  })
})
