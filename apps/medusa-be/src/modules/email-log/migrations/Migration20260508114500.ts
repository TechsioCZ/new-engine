import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260508114500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "email_log" add column if not exists "order_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_log_order_id" ON "email_log" ("order_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_email_log_order_id";`)
    this.addSql(
      `alter table if exists "email_log" drop column if exists "order_id";`
    )
  }
}
