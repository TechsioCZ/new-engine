import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260804210000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'create table "resend_config" ("id" text not null, "configuration_key" text not null default \'default\', "api_store_id" text null, "api_url" text not null default \'https://api.resend.com\', "is_enabled" boolean not null default false, "from_email" text null, "webhook_secret" text null, "request_timeout_ms" integer not null default 10000, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "resend_config_pkey" primary key ("id"));'
    )
    this.addSql(
      'create index "IDX_resend_config_deleted_at" on "resend_config" ("deleted_at") where "deleted_at" is null;'
    )
    this.addSql(
      'create unique index "IDX_resend_config_configuration_key_unique" on "resend_config" ("configuration_key") where "deleted_at" is null;'
    )
  }

  override async down(): Promise<void> {
    this.addSql('drop table "resend_config";')
  }
}
