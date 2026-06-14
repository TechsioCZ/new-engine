import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "workflow_queue_item" add column if not exists "dedupe_key" text null;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workflow_queue_item_workflow_dedupe_key_unique" ON "workflow_queue_item" ("workflow", "dedupe_key") WHERE deleted_at IS NULL AND dedupe_key IS NOT NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_workflow_queue_item_workflow_dedupe_key_unique";`
    )
    this.addSql(
      `alter table if exists "workflow_queue_item" drop column if exists "dedupe_key";`
    )
  }
}
