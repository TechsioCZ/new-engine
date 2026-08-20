import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260820220000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "market_variant_authority" (
      "id" text not null,
      "market_code" text not null,
      "product_id" text not null,
      "variant_id" text not null,
      "availability" text not null,
      "authority_sha256" text not null,
      "source_version" text not null,
      "approval_provenance" jsonb not null,
      "source_provenance" jsonb not null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "market_variant_authority_pkey" primary key ("id"),
      constraint "CHK_market_variant_authority_market_code" check ("market_code" ~ '^[a-z]{2}$'),
      constraint "CHK_market_variant_authority_availability" check ("availability" in ('sellable', 'unavailable')),
      constraint "CHK_market_variant_authority_product_id" check ("product_id" = btrim("product_id") and "product_id" <> ''),
      constraint "CHK_market_variant_authority_variant_id" check ("variant_id" = btrim("variant_id") and "variant_id" <> ''),
      constraint "CHK_market_variant_authority_sha256" check ("authority_sha256" ~ '^[0-9a-f]{64}$'),
      constraint "CHK_market_variant_authority_source_version" check ("source_version" = btrim("source_version") and "source_version" <> ''),
      constraint "CHK_market_variant_authority_approval_provenance" check (jsonb_typeof("approval_provenance") = 'object' and "approval_provenance" <> '{}'::jsonb),
      constraint "CHK_market_variant_authority_source_provenance" check (jsonb_typeof("source_provenance") = 'object' and "source_provenance" <> '{}'::jsonb)
    );`)
    this.addSql(`create index "IDX_market_variant_authority_deleted_at" on "market_variant_authority" ("deleted_at") where "deleted_at" is null;`)
    this.addSql(`create unique index "IDX_market_variant_authority_current_unique" on "market_variant_authority" ("market_code", "product_id", "variant_id") where "deleted_at" is null;`)
    this.addSql(`create index "IDX_market_variant_authority_hash" on "market_variant_authority" ("market_code", "authority_sha256") where "deleted_at" is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table "market_variant_authority";`)
  }
}
