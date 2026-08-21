import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260821143000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table if exists "claim_access" add column if not exists "sales_channel_id" text null;'
    )
    this.addSql(
      'update "claim_access" as access set "sales_channel_id" = orders."sales_channel_id" from "order" as orders where access."order_id" = orders."id" and access."sales_channel_id" is null;'
    )
    this.addSql(
      'delete from "claim_access" where "sales_channel_id" is null;'
    )
    this.addSql(
      'alter table if exists "claim_access" alter column "sales_channel_id" set not null;'
    )
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_claim_access_sales_channel_id" ON "claim_access" ("sales_channel_id") WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'alter table if exists "claim_case" add column if not exists "sales_channel_id" text null;'
    )
    this.addSql(
      'update "claim_case" as claim set "sales_channel_id" = orders."sales_channel_id" from "order" as orders where claim."order_id" = orders."id" and claim."sales_channel_id" is null;'
    )
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_claim_case_sales_channel_id" ON "claim_case" ("sales_channel_id") WHERE deleted_at IS NULL AND sales_channel_id IS NOT NULL;'
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      'drop index if exists "IDX_claim_case_sales_channel_id";'
    )
    this.addSql(
      'alter table if exists "claim_case" drop column if exists "sales_channel_id";'
    )
    this.addSql(
      'drop index if exists "IDX_claim_access_sales_channel_id";'
    )
    this.addSql(
      'alter table if exists "claim_access" drop column if exists "sales_channel_id";'
    )
  }
}
