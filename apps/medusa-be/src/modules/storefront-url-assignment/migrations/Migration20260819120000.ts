import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260819120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "storefront_url_assignment" (
      "id" text not null,
      "schema_version" integer not null default 1,
      "entity_kind" text not null,
      "entity_id" text not null,
      "market_code" text not null,
      "sales_channel_id" text not null,
      "public_slug" text not null,
      "publication_status" text not null default 'draft',
      "source_version" integer not null default 1,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "storefront_url_assignment_pkey" primary key ("id"),
      constraint "CHK_storefront_url_assignment_schema_version" check ("schema_version" = 1),
      constraint "CHK_storefront_url_assignment_entity_kind" check ("entity_kind" in ('category', 'brand', 'collection')),
      constraint "CHK_storefront_url_assignment_market_code" check ("market_code" in ('sk', 'cz', 'hu', 'ro')),
      constraint "CHK_storefront_url_assignment_publication_status" check ("publication_status" in ('draft', 'published')),
      constraint "CHK_storefront_url_assignment_source_version" check ("source_version" >= 1)
    );`)
    this.addSql(`create index if not exists "IDX_storefront_url_assignment_deleted_at" on "storefront_url_assignment" ("deleted_at") where "deleted_at" is null;`)
    this.addSql(`create unique index if not exists "IDX_storefront_url_assignment_identity_unique" on "storefront_url_assignment" ("entity_kind", "entity_id", "market_code") where "deleted_at" is null;`)
    this.addSql(`create index if not exists "IDX_storefront_url_assignment_channel_status" on "storefront_url_assignment" ("entity_kind", "sales_channel_id", "publication_status", "entity_id") where "deleted_at" is null;`)
    this.addSql(`create unique index if not exists "IDX_storefront_url_assignment_kind_market_slug_unique" on "storefront_url_assignment" ("entity_kind", "market_code", "public_slug") where "deleted_at" is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "storefront_url_assignment" cascade;`)
  }
}
