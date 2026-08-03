import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260803171638 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "storefront_text" drop constraint if exists "storefront_text_key_market_locale_unique";`);
    this.addSql(`create table if not exists "storefront_text" ("id" text not null, "key" text not null, "namespace" text not null, "locale" text not null, "market" text not null, "country" text not null, "domain" text not null, "default_value" text not null, "override_value" text null, "description" text null, "status" text not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "storefront_text_pkey" primary key ("id"), constraint CHK_storefront_text_status check (status IN ('active', 'draft')));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_text_deleted_at" ON "storefront_text" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_text_key_market_locale_unique" ON "storefront_text" ("key", "market", "locale") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_text_market_locale_namespace" ON "storefront_text" ("market", "locale", "namespace") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_text_status_market_locale" ON "storefront_text" ("status", "market", "locale") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "storefront_text" cascade;`);
  }

}
