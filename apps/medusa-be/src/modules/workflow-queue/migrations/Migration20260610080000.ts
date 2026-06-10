import { Migration } from "@mikro-orm/migrations"

export class Migration20260610080000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "workflow_queue_item" ("id" text not null, "run_at" timestamptz not null, "workflow" text not null, "arguments" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "workflow_queue_item_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_queue_item_deleted_at" ON "workflow_queue_item" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_queue_item_run_at" ON "workflow_queue_item" ("run_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_queue_item_workflow" ON "workflow_queue_item" ("workflow") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_queue_item_workflow_order_id" ON "workflow_queue_item" ("workflow", (("arguments"->>'order_id'))) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "workflow_queue_item" cascade;`)
  }
}
