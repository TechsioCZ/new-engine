import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "workflow_queue_item" add column if not exists "dedupe_key" text null;`
    )
    this.addSql(
      `update "workflow_queue_item" set "dedupe_key" = 'send-review-reminder-' || ("arguments"->>'order_id') where "workflow" = 'send-product-review-request' and "dedupe_key" is null and "arguments" ? 'order_id';`
    )
    this.addSql(
      `delete from "workflow_queue_item" a using (select ctid, row_number() over (partition by "workflow", "dedupe_key" order by "created_at" asc, "run_at" asc, "id" asc) as rn from "workflow_queue_item" where "deleted_at" is null and "dedupe_key" is not null) ranked where a.ctid = ranked.ctid and ranked.rn > 1;`
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
