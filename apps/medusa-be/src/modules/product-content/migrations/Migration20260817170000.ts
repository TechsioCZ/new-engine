import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260817170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_content" (
      "id" text not null,
      "product_id" text not null,
      "usage" text not null default '',
      "composition" text not null default '',
      "warning" text not null default '',
      "other" text not null default '',
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "product_content_pkey" primary key ("id")
    );`)
    this.addSql(
      `create index if not exists "IDX_product_content_deleted_at" on "product_content" ("deleted_at") where "deleted_at" is null;`
    )
    this.addSql(
      `create unique index if not exists "IDX_product_content_product_id_unique" on "product_content" ("product_id") where "deleted_at" is null;`
    )

    this.addSql(`
      insert into "product_content" (
        "id",
        "product_id",
        "usage",
        "composition",
        "warning",
        "other"
      )
      select
        'pcont_' || product."id",
        product."id",
        coalesce(
          product."metadata"::jsonb #>> '{content_sections_map,usage}',
          legacy_sections."usage",
          ''
        ),
        coalesce(
          product."metadata"::jsonb #>> '{content_sections_map,composition}',
          legacy_sections."composition",
          ''
        ),
        coalesce(
          product."metadata"::jsonb #>> '{content_sections_map,warning}',
          legacy_sections."warning",
          ''
        ),
        coalesce(
          product."metadata"::jsonb #>> '{content_sections_map,other}',
          legacy_sections."other",
          ''
        )
      from "product"
      left join lateral (
        select
          max(section ->> 'html') filter (where section ->> 'key' = 'usage') as "usage",
          max(section ->> 'html') filter (where section ->> 'key' = 'composition') as "composition",
          max(section ->> 'html') filter (where section ->> 'key' = 'warning') as "warning",
          max(section ->> 'html') filter (where section ->> 'key' = 'other') as "other"
        from jsonb_array_elements(
          case
            when jsonb_typeof(product."metadata"::jsonb -> 'content_sections') = 'array'
              then product."metadata"::jsonb -> 'content_sections'
            else '[]'::jsonb
          end
        ) as section
      ) as legacy_sections on true
      where product."deleted_at" is null
      on conflict do nothing;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_content" cascade;`)
  }
}
