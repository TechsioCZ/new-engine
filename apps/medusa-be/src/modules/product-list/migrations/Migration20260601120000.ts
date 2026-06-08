import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260601120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "product_list" ("id" text not null, "title" text not null, "handle" text not null, "type" text not null, "description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_list_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_list_deleted_at" ON "product_list" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_list_type" ON "product_list" ("type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_list_handle" ON "product_list" ("handle") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "product_list" add constraint "product_list_type_check" check ("type" in ('favorite', 'custom'));`
    )

    this.addSql(
      `create table if not exists "product_list_item" ("id" text not null, "quantity" integer not null default 1, "note" text null, "sort_order" integer not null default 0, "metadata" jsonb null, "list_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_list_item_pkey" primary key ("id"));`
    )
    this.addSql(
      `alter table if exists "product_list_item" add constraint "product_list_item_quantity_check" check ("quantity" >= 1);`
    )
    this.addSql(
      `alter table if exists "product_list_item" add constraint "product_list_item_sort_order_check" check ("sort_order" >= 0);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_list_item_list_id" ON "product_list_item" ("list_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_list_item_deleted_at" ON "product_list_item" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_list_item_list_sort_order" ON "product_list_item" ("list_id", "sort_order") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "product_list_item" add constraint "product_list_item_list_id_foreign" foreign key ("list_id") references "product_list" ("id") on update cascade on delete cascade;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "product_list_item" drop constraint if exists "product_list_item_list_id_foreign";`
    )
    this.addSql(
      `alter table if exists "product_list_item" drop constraint if exists "product_list_item_sort_order_check";`
    )
    this.addSql(
      `alter table if exists "product_list_item" drop constraint if exists "product_list_item_quantity_check";`
    )
    this.addSql(
      `alter table if exists "product_list" drop constraint if exists "product_list_type_check";`
    )
    this.addSql(`drop table if exists "product_list_item" cascade;`)
    this.addSql(`drop table if exists "product_list" cascade;`)
  }
}
