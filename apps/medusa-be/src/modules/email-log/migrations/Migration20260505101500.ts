import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260505101500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "email_webhook_event" ("id" text not null, "email_id" text not null, "type" text not null, "payload" jsonb null, "received_at" timestamptz not null, "processed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_webhook_event_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_webhook_event_deleted_at" ON "email_webhook_event" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_webhook_event_email_id" ON "email_webhook_event" ("email_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_webhook_event_processed_at" ON "email_webhook_event" ("processed_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_webhook_event" cascade;`)
  }
}
