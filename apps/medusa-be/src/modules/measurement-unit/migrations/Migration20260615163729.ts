import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260615163729 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_variant_measurement" drop constraint if exists "product_variant_measurement_variant_id_unique";`);
    this.addSql(`alter table if exists "product_measurement" drop constraint if exists "product_measurement_product_id_unique";`);
    this.addSql(`alter table if exists "measurement_unit" drop constraint if exists "measurement_unit_code_unique";`);
    this.addSql(`create table if not exists "measurement_unit" ("id" text not null, "base_quantity" numeric not null, "code" text not null, "name" text not null, "symbol" text not null, "description" text null, "raw_base_quantity" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "measurement_unit_pkey" primary key ("id"), constraint measurement_unit_base_quantity_positive check (base_quantity > 0));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_measurement_unit_deleted_at" ON "measurement_unit" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_measurement_unit_code_unique" ON "measurement_unit" ("code") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_measurement" ("id" text not null, "product_id" text not null, "measurement_unit_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_measurement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_measurement_measurement_unit_id" ON "product_measurement" ("measurement_unit_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_measurement_deleted_at" ON "product_measurement" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_measurement_product_id_unique" ON "product_measurement" ("product_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_variant_measurement" ("id" text not null, "product_variant_id" text not null, "product_unit_quantity" numeric not null, "product_measurement_id" text not null, "raw_product_unit_quantity" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_variant_measurement_pkey" primary key ("id"), constraint product_variant_measurement_quantity_positive check (product_unit_quantity > 0));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_variant_measurement_product_measurement_id" ON "product_variant_measurement" ("product_measurement_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_variant_measurement_deleted_at" ON "product_variant_measurement" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_variant_measurement_variant_id_unique" ON "product_variant_measurement" ("product_variant_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "product_measurement" add constraint "product_measurement_measurement_unit_id_foreign" foreign key ("measurement_unit_id") references "measurement_unit" ("id") on update cascade;`);

    this.addSql(`alter table if exists "product_variant_measurement" add constraint "product_variant_measurement_product_measurement_id_foreign" foreign key ("product_measurement_id") references "product_measurement" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_measurement" drop constraint if exists "product_measurement_measurement_unit_id_foreign";`);

    this.addSql(`alter table if exists "product_variant_measurement" drop constraint if exists "product_variant_measurement_product_measurement_id_foreign";`);

    this.addSql(`drop table if exists "measurement_unit" cascade;`);

    this.addSql(`drop table if exists "product_measurement" cascade;`);

    this.addSql(`drop table if exists "product_variant_measurement" cascade;`);
  }

}
