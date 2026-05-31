import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260514100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "symmy_webhook_config" ("id" text not null, "config_key" text not null default 'default', "is_enabled" boolean not null default false, "endpoints" jsonb not null default '[]'::jsonb, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "symmy_webhook_config_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_symmy_webhook_config_deleted_at" ON "symmy_webhook_config" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_symmy_webhook_config_config_key_unique" ON "symmy_webhook_config" ("config_key") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "symmy_webhook_config" cascade;`)
  }
}
