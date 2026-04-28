import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260423132257 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "packeta_config" drop constraint if exists "packeta_config_environment_unique";`);
    this.addSql(`create table if not exists "packeta_config" ("id" text not null, "environment" text not null, "is_enabled" boolean not null default false, "api_password" text null, "sender_label" text null, "eshop_id" text null, "default_label_format" text not null default 'A6', "default_label_offset" integer not null default 0, "cod_bank_account" text null, "cod_bank_code" text null, "cod_iban" text null, "cod_swift" text null, "sender_name" text null, "sender_street" text null, "sender_city" text null, "sender_zip_code" text null, "sender_country" text null, "sender_phone" text null, "sender_email" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "packeta_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_packeta_config_deleted_at" ON "packeta_config" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_packeta_config_environment_unique" ON "packeta_config" ("environment") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "packeta_config" cascade;`);
  }

}
