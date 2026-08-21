import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(
    process.cwd(),
    "src/modules/claim-case/migrations/Migration20260821143000.ts"
  ),
  "utf8"
)
  .toLowerCase()
  .replaceAll(/\s+/g, " ")

const snapshot = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "src/modules/claim-case/migrations/.snapshot-claim-case.json"
    ),
    "utf8"
  )
) as {
  tables: Array<{
    columns: Record<string, { nullable: boolean }>
    indexes: Array<{ keyName: string }>
    name: string
  }>
}

describe("claim-case market authority migration", () => {
  it("backfills access authority from the order before enforcing a required Sales Channel", () => {
    expect(migrationSource).toContain(
      'alter table if exists "claim_access" add column if not exists "sales_channel_id" text null'
    )
    expect(migrationSource).toContain(
      'update "claim_access" as access set "sales_channel_id" = orders."sales_channel_id" from "order" as orders where access."order_id" = orders."id"'
    )
    expect(migrationSource).toContain(
      'delete from "claim_access" where "sales_channel_id" is null'
    )
    expect(migrationSource).toContain(
      'alter table if exists "claim_access" alter column "sales_channel_id" set not null'
    )
  })

  it("retains historical manual claims while backfilling order-backed cases", () => {
    expect(migrationSource).toContain(
      'alter table if exists "claim_case" add column if not exists "sales_channel_id" text null'
    )
    expect(migrationSource).toContain(
      'update "claim_case" as claim set "sales_channel_id" = orders."sales_channel_id" from "order" as orders where claim."order_id" = orders."id"'
    )
    expect(migrationSource).not.toContain(
      'delete from "claim_case" where "sales_channel_id" is null'
    )
  })

  it.each([
    ["claim_access", false, "IDX_claim_access_sales_channel_id"],
    ["claim_case", true, "IDX_claim_case_sales_channel_id"],
  ])("keeps the %s snapshot aligned", (tableName, nullable, indexName) => {
    const table = snapshot.tables.find(({ name }) => name === tableName)

    expect(table?.columns.sales_channel_id?.nullable).toBe(nullable)
    expect(table?.indexes.map(({ keyName }) => keyName)).toContain(indexName)
  })
})
