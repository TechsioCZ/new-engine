import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260521150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "symmy_price_list_code" ("code" text not null, "erp_code" text not null, "price_list_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "symmy_price_list_code_pkey" primary key ("code"));`
    )
    this.addSql(
      `alter table if exists "symmy_price_list_code" add column if not exists "code" text;`
    )
    this.addSql(
      `alter table if exists "symmy_price_list_code" add column if not exists "erp_code" text;`
    )
    this.addSql(
      `alter table if exists "symmy_price_list_code" add column if not exists "price_list_id" text;`
    )
    this.addSql(
      `alter table if exists "symmy_price_list_code" add column if not exists "created_at" timestamptz not null default now();`
    )
    this.addSql(
      `alter table if exists "symmy_price_list_code" add column if not exists "updated_at" timestamptz not null default now();`
    )
    this.addSql(
      `alter table if exists "symmy_price_list_code" add column if not exists "deleted_at" timestamptz null;`
    )
    this.addSql(
      `delete from "symmy_price_list_code" where "erp_code" is null or "price_list_id" is null;`
    )
    this.addSql(
      `update "symmy_price_list_code" set "code" = concat('splc_', md5("erp_code" || ':' || "price_list_id")) where "code" is null;`
    )
    this.addSql(
      `alter table if exists "symmy_price_list_code" alter column "code" set not null;`
    )
    this.addSql(
      `alter table if exists "symmy_price_list_code" alter column "erp_code" set not null;`
    )
    this.addSql(
      `alter table if exists "symmy_price_list_code" alter column "price_list_id" set not null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_symmy_price_list_code_deleted_at" ON "symmy_price_list_code" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_symmy_price_list_code_erp_code_unique" ON "symmy_price_list_code" ("erp_code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_symmy_price_list_code_price_list_id_unique" ON "symmy_price_list_code" ("price_list_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "symmy_price_list_code" cascade;`)
  }
}
