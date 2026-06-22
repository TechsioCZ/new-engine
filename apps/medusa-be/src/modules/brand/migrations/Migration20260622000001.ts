import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260622000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "brand" ("id" text not null, "title" text not null, "handle" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_handle_unique" ON "brand" (handle) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "brand_attribute_type" ("id" text not null, "name" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_attribute_type_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_attribute_type_deleted_at" ON "brand_attribute_type" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_attribute_type_name_unique" ON "brand_attribute_type" ("name") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "brand_attribute" ("id" text not null, "value" text not null, "attribute_type_id" text not null, "brand_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_attribute_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_attribute_attribute_type_id" ON "brand_attribute" (attribute_type_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_attribute_brand_id" ON "brand_attribute" (brand_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_attribute_deleted_at" ON "brand_attribute" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`alter table if exists "brand_attribute" add constraint "brand_attribute_attribute_type_id_foreign" foreign key ("attribute_type_id") references "brand_attribute_type" ("id") on update cascade;`);
    this.addSql(`alter table if exists "brand_attribute" add constraint "brand_attribute_brand_id_foreign" foreign key ("brand_id") references "brand" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "brand_attribute" drop constraint if exists "brand_attribute_brand_id_foreign";`);
    this.addSql(`alter table if exists "brand_attribute" drop constraint if exists "brand_attribute_attribute_type_id_foreign";`);
    this.addSql(`drop table if exists "brand" cascade;`);
    this.addSql(`drop table if exists "brand_attribute_type" cascade;`);
    this.addSql(`drop table if exists "brand_attribute" cascade;`);
  }
}
