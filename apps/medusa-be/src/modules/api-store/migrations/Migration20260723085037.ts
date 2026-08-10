import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260723085037 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "api_store" drop constraint if exists "api_store_name_unique";`);
    this.addSql(`create table if not exists "api_store" ("id" text not null, "name" text not null, "api_url" text null, "api_key" text null, "credentials" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "api_store_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_api_store_deleted_at" ON "api_store" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_api_store_name_unique" ON "api_store" ("name") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "api_store" cascade;`);
  }

}
