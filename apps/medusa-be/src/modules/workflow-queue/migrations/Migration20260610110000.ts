import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610110000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_workflow_queue_item_workflow_order_id";`
    )
    this.addSql(
      `alter table if exists "workflow_queue_item" drop column if exists "order_id";`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "workflow_queue_item" add column if not exists "order_id" text null;`
    )
    this.addSql(
      `update "workflow_queue_item" set "order_id" = "arguments"->>'order_id' where "order_id" is null and "arguments" ? 'order_id';`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_queue_item_workflow_order_id" ON "workflow_queue_item" ("workflow", "order_id") WHERE deleted_at IS NULL;`
    )
  }
}
