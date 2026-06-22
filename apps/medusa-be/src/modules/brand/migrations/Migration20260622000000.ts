import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260622000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`drop table if exists "producer_attribute" cascade;`);
    this.addSql(`drop table if exists "producer_attribute_type" cascade;`);
    this.addSql(`drop table if exists "producer" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table if not exists "producer" ("id" text not null, "title" text not null, "handle" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "producer_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_producer_deleted_at" ON "producer" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_producer_handle_unique" ON "producer" (handle) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "producer_attribute_type" ("id" text not null, "name" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "producer_attribute_type_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_producer_attribute_type_deleted_at" ON "producer_attribute_type" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_producer_attribute_type_name_unique" ON "producer_attribute_type" ("name") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "producer_attribute" ("id" text not null, "value" text not null, "attribute_type_id" text not null, "producer_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "producer_attribute_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_producer_attribute_attribute_type_id" ON "producer_attribute" (attribute_type_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_producer_attribute_producer_id" ON "producer_attribute" (producer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_producer_attribute_deleted_at" ON "producer_attribute" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`alter table if exists "producer_attribute" add constraint "producer_attribute_attribute_type_id_foreign" foreign key ("attribute_type_id") references "producer_attribute_type" ("id") on update cascade;`);
    this.addSql(`alter table if exists "producer_attribute" add constraint "producer_attribute_producer_id_foreign" foreign key ("producer_id") references "producer" ("id") on update cascade;`);
  }
}
