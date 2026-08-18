import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260818064908 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_content" drop constraint if exists "product_content_product_id_unique";`);
    this.addSql(`create table if not exists "product_content" ("id" text not null, "product_id" text not null, "usage" text not null default '', "composition" text not null default '', "warning" text not null default '', "other" text not null default '', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_content_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_content_deleted_at" ON "product_content" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_content_product_id_unique" ON "product_content" ("product_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_content" cascade;`);
  }

}
