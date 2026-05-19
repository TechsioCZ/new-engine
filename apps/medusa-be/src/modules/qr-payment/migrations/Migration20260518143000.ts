import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260518143000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "qr_payment_config" drop constraint if exists "qr_payment_config_environment_unique";`
    )
    this.addSql(
      `create table if not exists "qr_payment_config" ("id" text not null, "environment" text not null, "iban" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qr_payment_config_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_qr_payment_config_deleted_at" ON "qr_payment_config" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_qr_payment_config_environment_unique" ON "qr_payment_config" ("environment") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "qr_payment_config" cascade;`)
  }
}
