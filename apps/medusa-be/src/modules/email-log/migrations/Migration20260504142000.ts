import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260504142000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "email_log" ("id" text not null, "email_id" text not null, "customer_id" text null, "type" text not null, "subject" text not null, "sent_to" text not null, "sent_at" timestamptz not null, "checked_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_log_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_log_deleted_at" ON "email_log" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_log_email_id" ON "email_log" ("email_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_log_customer_id" ON "email_log" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_log_sent_to" ON "email_log" ("sent_to") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_log" cascade;`)
  }
}
