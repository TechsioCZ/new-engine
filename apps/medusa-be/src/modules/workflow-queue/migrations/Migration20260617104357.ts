import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260617104357 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "workflow_queue_item" drop constraint if exists "workflow_queue_item_workflow_dedupe_key_unique";`);
    this.addSql(`drop index if exists "IDX_workflow_queue_item_workflow_order_id";`);

    this.addSql(`alter table if exists "workflow_queue_item" rename column "order_id" to "dedupe_key";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workflow_queue_item_workflow_dedupe_key_unique" ON "workflow_queue_item" ("workflow", "dedupe_key") WHERE deleted_at IS NULL AND dedupe_key IS NOT NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_workflow_queue_item_workflow_dedupe_key_unique";`);

    this.addSql(`alter table if exists "workflow_queue_item" rename column "dedupe_key" to "order_id";`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_workflow_queue_item_workflow_order_id" ON "workflow_queue_item" ("workflow", "order_id") WHERE deleted_at IS NULL;`);
  }

}
