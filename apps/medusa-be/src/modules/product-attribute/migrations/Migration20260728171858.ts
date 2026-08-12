import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728171858 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_attribute" drop constraint if exists "product_attribute_product_definition_unique";`);
    this.addSql(`alter table if exists "product_attribute_option" drop constraint if exists "product_attribute_option_definition_key_unique";`);
    this.addSql(`alter table if exists "product_attribute_definition" drop constraint if exists "product_attribute_definition_key_unique";`);
    this.addSql(`create table if not exists "product_attribute_definition" ("id" text not null, "key" text not null, "label" text not null, "input_type" text check ("input_type" in ('text', 'select')) not null, "is_public" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_attribute_definition_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_attribute_definition_deleted_at" ON "product_attribute_definition" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_attribute_definition_key_unique" ON "product_attribute_definition" ("key") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_attribute_option" ("id" text not null, "key" text not null, "label" text not null, "definition_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_attribute_option_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_attribute_option_definition_id" ON "product_attribute_option" ("definition_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_attribute_option_deleted_at" ON "product_attribute_option" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_attribute_option_definition_key_unique" ON "product_attribute_option" ("definition_id", "key") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_attribute" ("id" text not null, "product_id" text not null, "text_value" text null, "definition_id" text not null, "option_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_attribute_pkey" primary key ("id"), constraint product_attribute_exactly_one_value check (((text_value IS NOT NULL)::int + (option_id IS NOT NULL)::int) = 1));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_attribute_definition_id" ON "product_attribute" ("definition_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_attribute_option_id" ON "product_attribute" ("option_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_attribute_deleted_at" ON "product_attribute" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_attribute_product_definition_unique" ON "product_attribute" ("product_id", "definition_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_attribute_product_id" ON "product_attribute" ("product_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "product_attribute_option" add constraint "product_attribute_option_definition_id_foreign" foreign key ("definition_id") references "product_attribute_definition" ("id") on update cascade;`);

    this.addSql(`alter table if exists "product_attribute" add constraint "product_attribute_definition_id_foreign" foreign key ("definition_id") references "product_attribute_definition" ("id") on update cascade;`);
    this.addSql(`alter table if exists "product_attribute" add constraint "product_attribute_option_id_foreign" foreign key ("option_id") references "product_attribute_option" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_attribute_option" drop constraint if exists "product_attribute_option_definition_id_foreign";`);

    this.addSql(`alter table if exists "product_attribute" drop constraint if exists "product_attribute_definition_id_foreign";`);

    this.addSql(`alter table if exists "product_attribute" drop constraint if exists "product_attribute_option_id_foreign";`);

    this.addSql(`drop table if exists "product_attribute_definition" cascade;`);

    this.addSql(`drop table if exists "product_attribute_option" cascade;`);

    this.addSql(`drop table if exists "product_attribute" cascade;`);
  }

}
